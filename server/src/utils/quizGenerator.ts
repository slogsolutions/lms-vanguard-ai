import { TextBlob } from 'text-blob';

export async function generateQuizQuestions(extractedText: string, promptText: string) {
  const prompt = `Generate quiz questions based on the following text: ${extractedText}\nPrompt: ${promptText}`;
  const response = await Ollama.chat([prompt]);

  const quizQuestions = response[0].text.split('\n');
  return quizQuestions;
}