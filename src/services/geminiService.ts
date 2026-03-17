import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateImages(prompt: string, model: string, base64Image?: string) {
  const parts: any[] = [{ text: prompt }];
  
  if (base64Image) {
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/)?.[1] || 'image/png';
    parts.unshift({
      inlineData: {
        data: base64Image.split(',')[1],
        mimeType: mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: parts,
    },
  });
  
  return response;
}
