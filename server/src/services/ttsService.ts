import { spawn } from 'child_process';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function streamTTS(text: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    const piperDir = path.join(__dirname, '../../../piper');
    const piperExe = path.join(piperDir, 'piper.exe');
    const modelPath = path.join(piperDir, 'en_US-lessac-medium.onnx');

    // Create a temporary file path for the audio output
    // This avoids Windows stdout corruption (\n -> \r\n) which destroys binary WAV data
    const tempFile = path.join(os.tmpdir(), `piper_${randomBytes(4).toString('hex')}.wav`);

    const child = spawn(piperExe, [
      '--model', modelPath,
      '--output_file', tempFile 
    ], {
      windowsHide: true,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        return reject(new Error(`Piper exited with code ${code}`));
      }

      try {
        if (!fs.existsSync(tempFile)) {
          return reject(new Error('Piper finished but no output file was created.'));
        }

        // Read the file and clean up after
        const fileBuffer = fs.readFileSync(tempFile);
        
        // Delete the temp file now that we have the data
        fs.unlinkSync(tempFile);
        
        resolve(Readable.from(fileBuffer));
      } catch (err) {
        reject(err);
      }
    });

    child.on('error', (error) => {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      console.error('Failed to start Piper process:', error);
      reject(error);
    });

    // Piper generates a new separate WAV file for each newline.
    // Replace all newlines with spaces so it generates one single contiguous WAV file.
    const singleLineText = text.replace(/[\r\n]+/g, ' ').trim();
    
    // Pipe input into stdin
    Readable.from([singleLineText + '\n']).pipe(child.stdin);
  });
}
