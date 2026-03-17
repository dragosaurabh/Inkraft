import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { sectionContent, keyword } = req.body;
  if (!sectionContent?.trim()) return res.status(400).json({ error: 'Section required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const currentYear = new Date().getFullYear();
  const raw = readFileSync(join(process.cwd(), 'inkraft-system-prompt.txt'), 'utf-8');
  const prompt = `Rewrite this section to be more detailed, more human, and at least 50% longer. Keep the same heading. Write in the same style and tone. Topic: "${keyword || 'general'}". Year: ${currentYear}.\n\n${sectionContent.trim()}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: raw,
    });
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 16384 },
    });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(`data: ${text.replace(/\n/g, '\\n')}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
