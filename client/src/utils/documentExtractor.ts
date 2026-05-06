import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Use a local worker path for offline support
// Vite will automatically bundle this correctly
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export const extractTextFromExcel = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  let text = '';
  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    text += `Sheet: ${sheetName}\n`;
    text += XLSX.utils.sheet_to_txt(worksheet) + '\n\n';
  });
  return text.trim();
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(' ') + '\n';
  }
  return fullText.trim();
};

export const extractTextFromWord = async (file: File): Promise<string> => {
  const data = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value.trim();
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return extractTextFromExcel(file);
  } else if (name.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (name.endsWith('.docx')) {
    return extractTextFromWord(file);
  } else {
    return await file.text();
  }
};
