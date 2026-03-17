import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { keyword, tone, contentType, wordCount, audience, apiKey: userApiKey } = req.body;
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'API key not set. Add it in Settings.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const raw = readFileSync(join(process.cwd(), 'inkraft-system-prompt.txt'), 'utf-8');
  const brief = [
    keyword,
    audience ? `| audience: ${audience}` : '',
    tone ? `| tone: ${tone}` : '',
    contentType && contentType !== 'auto' ? `| type: ${contentType}` : '',
    wordCount ? `| wordCount: ${wordCount}` : '',
  ].filter(Boolean).join(' ');

  const prompt = `${brief}\n\nGenerate ONLY Output Blocks 1, 2, and 3. Do NOT generate Block 4 or Block 5.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: raw,
    });
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 65536 },
    });
    for await (const chunk of result.stream) {
      res.write(`data: ${JSON.stringify({ text: chunk.text() })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
