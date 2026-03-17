import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';

const currentYear = new Date().getFullYear();

function getSystemPrompt() {
  const raw = readFileSync(
    join(process.cwd(), 'inkraft-system-prompt.txt'), 
    'utf-8'
  );
  return raw + `\n\n---\n\n## YEAR CONTEXT\n\nThe current year is ${currentYear}. Always use ${currentYear} in article titles and content.\n`;
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: getSystemPrompt(),
  });
}

function buildUserPrompt({ keyword, audience, tone, contentType, wordCount, imageStyle }) {
  if (!keyword?.trim()) throw new Error('Keyword is required.');
  let prompt = keyword.trim();
  const parts = [];
  if (audience?.trim()) parts.push(`audience: ${audience.trim()}`);
  if (tone?.trim()) parts.push(`tone: ${tone.trim()}`);
  if (contentType?.trim()) parts.push(`type: ${contentType.trim()}`);
  if (wordCount?.trim()) parts.push(`word count: ${wordCount.trim()}`);
  if (parts.length > 0) prompt += ' | ' + parts.join(' | ');
  const style = imageStyle?.trim() || 'photorealistic';
  prompt += `\n\nimageStyle: ${style}\nGenerate the featured image prompt in ${style.toUpperCase().replace('-', ' ')} style only.`;
  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let userPrompt;
  try {
    userPrompt = buildUserPrompt(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const model = getModel();
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        const encoded = text.replace(/\n/g, '\\n');
        res.write(`data: ${encoded}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini error:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
