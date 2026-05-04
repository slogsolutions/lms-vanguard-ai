import React, { useState } from 'react';
import api from '../api/axios';

export const TTSPlayer: React.FC = () => {
  const [text, setText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayTTS = async () => {
    if (!text.trim()) return;
    
    setIsPlaying(true);
    
    try {
      // 1. Fetch the streamed audio from the backend
      const ttsUrl = `${(api.defaults.baseURL || 'http://localhost:5000/api').replace(/\/$/, '')}/tts`;
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Network response was not ok');
      }

      // 2. Convert the response stream to a Blob
      const blob = await response.blob();
      
      // 3. Create an object URL for the Blob
      const audioUrl = URL.createObjectURL(blob);
      
      // 4. Play the audio
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlaying(false);
        // Clean up the object URL to avoid memory leaks
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('Error playing TTS:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px' }}>
      <h3>Piper TTS Demo</h3>
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to synthesize..."
        rows={4}
        style={{ width: '100%', marginBottom: '10px', color: 'black' }}
      />
      <button 
        onClick={handlePlayTTS} 
        disabled={isPlaying || !text.trim()}
        style={{ padding: '10px 20px', cursor: 'pointer', color: 'black' }}
      >
        {isPlaying ? 'Playing...' : 'Play Audio'}
      </button>
    </div>
  );
};
