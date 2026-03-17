import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  const genAI = new GoogleGenerativeAI(apiKey);
  const raw = readFileSync(join(process.cwd(), 'inkraft-system-prompt.txt'), 'utf-8');
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: raw,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { keyword, imageStyle, articleTitle } = req.body;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const prompt = `Generate ONLY Output Block 5 (Featured Image Prompt) for:
Article title: "${articleTitle}"
Topic: "${keyword}"
Image style: ${imageStyle || 'photorealistic'}
Follow the Block 5 format exactly. Output ONLY the image prompt block.`;

  try {
    const model = getModel();
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
    });
    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
