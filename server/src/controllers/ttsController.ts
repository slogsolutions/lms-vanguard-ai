import { Request, Response } from 'express';
import { streamTTS } from '../services/ttsService.js';

export const synthesizeTTS = async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Valid text is required in the request body.' });
  }

  try {
    const audioStream = await streamTTS(text);

    // Set the appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Pipe the audio stream directly to the response
    audioStream.pipe(res);

    audioStream.on('error', (err) => {
      console.error('Error in TTS stream:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate audio.' });
      } else {
        res.end();
      }
    });

    // We don't need to manually end the response; pipe handles it when the stream ends.
  } catch (error) {
    console.error('Error generating TTS:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error while generating TTS.' });
    }
  }
};
