import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ── Current year (injected into system prompt) ──────────────────────
const currentYear = new Date().getFullYear();

// ── Load system prompt ──────────────────────────────────────────────
const rawSystemPrompt = readFileSync(
  join(__dirname, 'inkraft-system-prompt.txt'),
  'utf-8'
);

// Inject the current year into the system prompt
const systemPrompt = rawSystemPrompt + `\n\n---\n\n## YEAR CONTEXT\n\nThe current year is ${currentYear}. Always use ${currentYear} in article titles, content, and references — never use outdated years. If the article references a year (e.g. "Best X in [year]"), always use ${currentYear}.\n`;

// ── Middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ── Gemini client setup ─────────────────────────────────────────────
function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not set. Add your GEMINI_API_KEY to the .env file. ' +
      'Get your free key at https://aistudio.google.com/app/apikey'
    );
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });
}

// ── Build the user prompt from form inputs ──────────────────────────
function buildUserPrompt({ keyword, audience, tone, contentType, wordCount }) {
  if (!keyword || !keyword.trim()) {
    throw new Error('Keyword is required.');
  }

  let prompt = keyword.trim();
  const parts = [];

  if (audience && audience.trim()) parts.push(`audience: ${audience.trim()}`);
  if (tone && tone.trim()) parts.push(`tone: ${tone.trim()}`);
  if (contentType && contentType.trim()) parts.push(`type: ${contentType.trim()}`);
  if (wordCount && wordCount.trim()) parts.push(`word count: ${wordCount.trim()}`);

  if (parts.length > 0) {
    prompt += ' | ' + parts.join(' | ');
  }

  return prompt;
}

// ── POST /api/generate — streaming SSE endpoint ─────────────────────
app.post('/api/generate', async (req, res) => {
  // Validate input
  let userPrompt;
  try {
    userPrompt = buildUserPrompt(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

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
        // Send as SSE data event — encode newlines for SSE protocol
        const encoded = text.replace(/\n/g, '\\n');
        res.write(`data: ${encoded}\n\n`);
      }
    }

    // Signal completion
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Gemini API error:', err);
    const errorMsg = err.message || 'An error occurred while generating the article.';
    res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// ── POST /api/rewrite-section — rewrite a single H2 section ────────
app.post('/api/rewrite-section', async (req, res) => {
  const { sectionContent, keyword } = req.body;

  if (!sectionContent || !sectionContent.trim()) {
    return res.status(400).json({ error: 'Section content is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const model = getModel();

    const rewritePrompt = `Rewrite this section to be more detailed, more human, and at least 50% longer. Keep the same heading. Write in the same style and tone as the rest of the article. Topic context: "${keyword || 'general'}". The current year is ${currentYear}.\n\nHere is the section to rewrite:\n\n${sectionContent.trim()}`;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: rewritePrompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 16384,
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
    console.error('Rewrite API error:', err);
    const errorMsg = err.message || 'An error occurred while rewriting the section.';
    res.write(`event: error\ndata: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
});

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_key_here';
  res.json({ status: 'ok', apiKeyConfigured: hasKey });
});

// ── Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ✦ Inkraft is running at http://localhost:${PORT}\n`);
});
