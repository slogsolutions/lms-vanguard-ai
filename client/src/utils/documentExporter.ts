import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, PageBreak } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const exportToPDF = (title: string, content: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxLineWidth = pageWidth - (margin * 2);

  doc.setFontSize(18);
  doc.text(title, margin, 25);
  doc.setFontSize(12);
  
  const splitText = doc.splitTextToSize(content, maxLineWidth);
  let cursorY = 35;

  splitText.forEach((line: string) => {
    if (cursorY > 280) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(line, margin, cursorY);
    cursorY += 7;
  });

  doc.save(`${title.replace(/\s+/g, '_')}_Paper.pdf`);
};

export const exportToWord = async (title: string, content: string) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "\n",
            }),
          ],
        }),
        ...content.split('\n').map(line => new Paragraph({
          children: [
            new TextRun({
              text: line,
              size: 24, // 12pt
            }),
          ],
        })),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/\s+/g, '_')}_Paper.docx`);
};

const splitRow = (line: string) => {
  if (line.includes(',')) return line.split(',').map(cell => cell.trim());
  if (line.includes('\t')) return line.split('\t').map(cell => cell.trim());
  return [line.trim()];
};

export const exportToExcel = (title: string, content: string) => {
  const rows = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(splitRow);

  const worksheet = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['No extracted content']]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Converted Data');

  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, `${title.replace(/\s+/g, '_')}_Data.xlsx`);
};

export const downloadOriginalFile = (file: File, outputName?: string) => {
  saveAs(file, outputName ?? file.name);
};

export const mergePdfFiles = async (files: File[], title = 'Merged_Files') => {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const sourceBytes = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(sourceBytes);
    const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  const pdfBuffer = mergedBytes.buffer.slice(
    mergedBytes.byteOffset,
    mergedBytes.byteOffset + mergedBytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  saveAs(blob, `${title.replace(/\s+/g, '_')}.pdf`);
};

export const mergeExcelFiles = async (files: File[], title = 'Merged_Files') => {
  const mergedWorkbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  for (const file of files) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    workbook.SheetNames.forEach(sheetName => {
      const baseName = `${file.name.replace(/\.[^.]+$/, '')}-${sheetName}`.slice(0, 28);
      let finalName = baseName || 'Sheet';
      let suffix = 1;

      while (usedNames.has(finalName)) {
        finalName = `${baseName.slice(0, 25)}-${suffix}`;
        suffix += 1;
      }

      usedNames.add(finalName);
      XLSX.utils.book_append_sheet(mergedWorkbook, workbook.Sheets[sheetName], finalName);
    });
  }

  const output = XLSX.write(mergedWorkbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([output], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  saveAs(blob, `${title.replace(/\s+/g, '_')}.xlsx`);
};

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const exportPdfToWordLayout = async (file: File, title?: string) => {
  const pdfData = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const children: Paragraph[] = [];
  const targetWidth = 610;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas rendering is not available in this browser.');
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const targetHeight = Math.round(targetWidth * (viewport.height / viewport.width));
    const imageBytes = dataUrlToBytes(canvas.toDataURL('image/png'));

    children.push(new Paragraph({
      children: [
        new ImageRun({
          data: imageBytes,
          type: 'png',
          transformation: {
            width: targetWidth,
            height: targetHeight,
          },
        }),
        ...(pageNumber < pdf.numPages ? [new PageBreak()] : []),
      ],
    }));
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 360,
            right: 360,
            bottom: 360,
            left: 360,
          },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const outputName = title ?? (file.name.replace(/\.[^.]+$/, '') || 'Converted_PDF');
  saveAs(blob, `${outputName.replace(/\s+/g, '_')}.docx`);
};
