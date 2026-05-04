import { Request, Response } from 'express';
import { streamTTS } from '../services/ttsService.js';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const synthesizeTTS = async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Valid text is required in the request body.' });
  }

  try {
    const audioStream = await streamTTS(text);
    const buf = await streamToBuffer(audioStream);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  } catch (error) {
    console.error('Error generating TTS:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error while generating TTS.' });
    }
  }
};
