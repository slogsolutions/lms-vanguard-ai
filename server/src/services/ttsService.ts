import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function streamTTS(text: string): Promise<Readable> {
  return new Promise((resolve, reject) => {
    const piperDir = path.join(__dirname, '../../../piper');
    const piperExe = path.join(piperDir, 'piper.exe');
    const modelPath = path.join(piperDir, 'en_US-lessac-medium.onnx');

    const child = spawn(piperExe, [
      '--model', modelPath,
      '--output_file', '-' 
    ], {
      windowsHide: true,
    });

    const bufs: Buffer[] = [];
    child.stdout.on('data', (data) => bufs.push(data));

    child.on('close', (code) => {
      if (code !== 0 && bufs.length === 0) {
        return reject(new Error(`Piper exited with code ${code}`));
      }

      const buf = Buffer.concat(bufs);
      
      // Fix Windows stdout text-mode corruption (\n replaced with \r\n)
      const fixed = Buffer.alloc(buf.length);
      let j = 0;
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] === 0x0D && buf[i+1] === 0x0A) {
          continue; // Skip the injected \r
        }
        fixed[j++] = buf[i];
      }
      
      const cleanBuf = fixed.subarray(0, j);
      resolve(Readable.from(cleanBuf));
    });

    child.on('error', (error) => {
      console.error('Failed to start Piper process:', error);
      reject(error);
    });

    child.stderr.on('data', (data) => {
      // Diagnostic info
      console.log(`Piper log: ${data}`);
    });

    // Piper generates a new separate WAV file for each newline.
    // Replace all newlines with spaces so it generates one single contiguous WAV file.
    const singleLineText = text.replace(/[\r\n]+/g, ' ').trim();
    child.stdin.write(singleLineText + '\n');
    child.stdin.end();
  });
}
