export async function generateQuizQuestions(extractedText: string, promptText: string) {
  const prompt = `Generate quiz questions based on the following text: ${extractedText}\nPrompt: ${promptText}`;
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const model = process.env.MODEL || 'llama3.2:1b';
  const response = await fetch(`${ollamaUrl.replace(/\/+$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama quiz generation failed: ${response.status}`);
  }

  const data: any = await response.json();
  const content = data.message?.content || data.response || '';
  const quizQuestions = content.split('\n').filter(Boolean);
  return quizQuestions;
}
