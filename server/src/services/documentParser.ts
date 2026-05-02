import fs from "fs";
import path from "path";

// ── Types ───────────────────────────────────────────────────
export interface ParsedDocument {
    text: string;
    metadata: {
        pages?: number;
        sheets?: string[];
        wordCount: number;
        fileType: string;
        hasTable: boolean;
    };
    /** Structurally separated sections (tables get their own section) */
    sections: DocumentSection[];
}

export interface DocumentSection {
    type: "text" | "table";
    content: string;
    metadata?: Record<string, unknown>;
}

// ── PDF Parser ──────────────────────────────────────────────
async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    // pdf-parse v2 exports a PDFParse class (v1 exported a function).
    const pdfParseModule = (await import("pdf-parse")) as any;
    const PDFParseCtor =
        (typeof pdfParseModule?.PDFParse === "function" && pdfParseModule.PDFParse)
        || (typeof pdfParseModule?.default?.PDFParse === "function" && pdfParseModule.default.PDFParse)
        || (typeof pdfParseModule?.default === "function" && pdfParseModule.default); // unlikely, but safe

    if (typeof PDFParseCtor !== "function") {
        const keys = pdfParseModule && typeof pdfParseModule === "object" ? Object.keys(pdfParseModule) : [];
        throw new Error(
            `PDF parser load failed: could not find PDFParse constructor in pdf-parse. Keys: ${keys.join(", ") || "none"}`
        );
    }

    const parser = new PDFParseCtor({ data: buffer });
    let result: any;
    try {
        result = await parser.getText();
    } finally {
        // Always attempt to free memory
        if (typeof parser.destroy === "function") {
            await parser.destroy();
        }
    }

    const text = result?.text?.trim() || "";
    const sections = splitTextIntoSections(text);

    return {
        text,
        metadata: {
            pages: result?.total,
            wordCount: text.split(/\s+/).filter(Boolean).length,
            fileType: "pdf",
            hasTable: sections.some(s => s.type === "table"),
        },
        sections,
    };
}

// ── DOCX Parser ─────────────────────────────────────────────
async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
    const mammoth = await import("mammoth");

    // Extract raw text (ignores images automatically)
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim() || "";

    // Also extract HTML for table detection
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const html = htmlResult.value || "";

    const sections: DocumentSection[] = [];
    const hasTable = html.includes("<table");

    if (hasTable) {
        // Extract tables from HTML and convert to structured text
        const tableSections = extractTablesFromHtml(html);
        const nonTableText = removeHtmlTags(html.replace(/<table[\s\S]*?<\/table>/gi, "\n[TABLE_REMOVED]\n"));

        if (nonTableText.trim()) {
            sections.push({ type: "text", content: nonTableText.trim() });
        }
        sections.push(...tableSections);
    } else {
        sections.push(...splitTextIntoSections(text));
    }

    return {
        text,
        metadata: {
            wordCount: text.split(/\s+/).filter(Boolean).length,
            fileType: "docx",
            hasTable,
        },
        sections,
    };
}

// ── XLSX / CSV Parser ───────────────────────────────────────
async function parseXLSX(buffer: Buffer): Promise<ParsedDocument> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sections: DocumentSection[] = [];
    const sheetNames: string[] = [];
    const allText: string[] = [];

    for (const sheetName of workbook.SheetNames) {
        sheetNames.push(sheetName);
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        // Convert sheet to JSON array-of-arrays
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length === 0) continue;

        // First row as headers
        const headers = (rows[0] as unknown[]).map(h => String(h ?? "").trim());
        const dataRows = rows.slice(1).filter(row =>
            (row as unknown[]).some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "")
        );

        if (dataRows.length === 0) continue;

        // Build structured table text
        const tableLines: string[] = [`Sheet: ${sheetName}`, `Columns: ${headers.join(" | ")}`];

        for (const row of dataRows) {
            const cells = row as unknown[];
            const labeledCells = headers.map((h, i) => {
                const val = String(cells[i] ?? "").trim();
                return val ? `${h}: ${val}` : null;
            }).filter(Boolean);

            if (labeledCells.length > 0) {
                tableLines.push(`Row: ${labeledCells.join(" | ")}`);
            }
        }

        const tableText = tableLines.join("\n");
        allText.push(tableText);

        sections.push({
            type: "table",
            content: tableText,
            metadata: { sheetName, rowCount: dataRows.length, columnCount: headers.length },
        });
    }

    const text = allText.join("\n\n");

    return {
        text,
        metadata: {
            sheets: sheetNames,
            wordCount: text.split(/\s+/).filter(Boolean).length,
            fileType: "xlsx",
            hasTable: true,
        },
        sections,
    };
}

// ── CSV Parser ──────────────────────────────────────────────
async function parseCSV(buffer: Buffer): Promise<ParsedDocument> {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    // CSV is a single-sheet workbook in SheetJS, reuse XLSX logic
    return parseXLSX(buffer);
}

// ── Main Entry Point ────────────────────────────────────────
const MIME_MAP: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
    "application/vnd.ms-excel": "xlsx",
};

const EXT_MAP: Record<string, string> = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".xlsx": "xlsx",
    ".csv": "csv",
    ".xls": "xlsx",
};

export function getFileType(mimeType: string, fileName: string): string | null {
    const fromMime = MIME_MAP[mimeType];
    if (fromMime) return fromMime;

    const ext = path.extname(fileName).toLowerCase();
    return EXT_MAP[ext] || null;
}

export async function parseDocument(filePath: string, mimeType: string, fileName: string): Promise<ParsedDocument> {
    const fileType = getFileType(mimeType, fileName);
    if (!fileType) {
        throw new Error(`Unsupported file type: ${mimeType} (${fileName})`);
    }

    const buffer = fs.readFileSync(filePath);

    switch (fileType) {
        case "pdf":
            return parsePDF(buffer);
        case "docx":
            return parseDOCX(buffer);
        case "xlsx":
            return parseXLSX(buffer);
        case "csv":
            return parseCSV(buffer);
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }
}

// ── Helpers ─────────────────────────────────────────────────

/** Detect table-like patterns in plain text (pipe-separated, tab-separated) */
function splitTextIntoSections(text: string): DocumentSection[] {
    const lines = text.split("\n");
    const sections: DocumentSection[] = [];
    let currentText: string[] = [];
    let currentTable: string[] = [];
    let inTable = false;

    for (const line of lines) {
        const isTableRow = isLikelyTableRow(line);

        if (isTableRow && !inTable) {
            // Flush text buffer
            if (currentText.length > 0) {
                const content = currentText.join("\n").trim();
                if (content) sections.push({ type: "text", content });
                currentText = [];
            }
            inTable = true;
            currentTable.push(line);
        } else if (isTableRow && inTable) {
            currentTable.push(line);
        } else if (!isTableRow && inTable) {
            // Flush table buffer
            if (currentTable.length > 0) {
                sections.push({ type: "table", content: currentTable.join("\n").trim() });
                currentTable = [];
            }
            inTable = false;
            currentText.push(line);
        } else {
            currentText.push(line);
        }
    }

    // Flush remaining
    if (currentTable.length > 0) {
        sections.push({ type: "table", content: currentTable.join("\n").trim() });
    }
    if (currentText.length > 0) {
        const content = currentText.join("\n").trim();
        if (content) sections.push({ type: "text", content });
    }

    if (sections.length === 0 && text.trim()) {
        sections.push({ type: "text", content: text.trim() });
    }

    return sections;
}

function isLikelyTableRow(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Pipe-separated table rows
    const pipeCount = (trimmed.match(/\|/g) || []).length;
    if (pipeCount >= 2) return true;

    // Tab-separated with multiple columns
    const tabCount = (trimmed.match(/\t/g) || []).length;
    if (tabCount >= 2) return true;

    // Multiple consecutive spaces suggesting column alignment
    if (/\S\s{3,}\S/.test(trimmed) && (trimmed.match(/\s{3,}/g) || []).length >= 2) return true;

    return false;
}

function extractTablesFromHtml(html: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const tableRegex = /<table[\s\S]*?<\/table>/gi;
    let match: RegExpExecArray | null;

    while ((match = tableRegex.exec(html)) !== null) {
        const tableHtml = match[0];
        const rows: string[][] = [];

        const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
        let rowMatch: RegExpExecArray | null;

        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const cells: string[] = [];
            const cellRegex = /<(?:td|th)[\s\S]*?<\/(?:td|th)>/gi;
            let cellMatch: RegExpExecArray | null;

            while ((cellMatch = cellRegex.exec(rowMatch[0])) !== null) {
                cells.push(removeHtmlTags(cellMatch[0]).trim());
            }

            if (cells.length > 0) rows.push(cells);
        }

        if (rows.length > 0) {
            const headers = rows[0];
            const dataRows = rows.slice(1);

            const lines = [`Columns: ${headers.join(" | ")}`];
            for (const row of dataRows) {
                const labeled = headers.map((h, i) => {
                    const val = (row[i] || "").trim();
                    return val ? `${h}: ${val}` : null;
                }).filter(Boolean);
                if (labeled.length > 0) lines.push(`Row: ${labeled.join(" | ")}`);
            }

            sections.push({
                type: "table",
                content: lines.join("\n"),
                metadata: { rowCount: dataRows.length, columnCount: headers.length },
            });
        }
    }

    return sections;
}

function removeHtmlTags(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
}

export const SUPPORTED_MIME_TYPES = Object.keys(MIME_MAP);
export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP);
