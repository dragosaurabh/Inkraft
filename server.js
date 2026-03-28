import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import our modular handlers
import researchHandler from './api/research.js';
import generateHandler from './api/generate.js';

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
app.use(express.static(join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // HTML: never cache, always fetch fresh
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // CSS/JS: always revalidate with server (uses ETag for efficiency)
    else if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  }
}));

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
function buildUserPrompt({ keyword, audience, tone, contentType, wordCount, imageStyle }) {
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

  // Append image style directive
  const style = (imageStyle && imageStyle.trim()) ? imageStyle.trim() : 'photorealistic';
  prompt += `\n\nimageStyle: ${style}\nGenerate the featured image prompt in ${style.toUpperCase().replace('-', ' ')} style only.`;

  return prompt;
}

// ── METADATA PARSING (V3) ───────────────────────────────────────────
function extractDelimited(text, fieldName) {
  const start = `%%${fieldName}_START%%`;
  const end = `%%${fieldName}_END%%`;
  const startIdx = text.indexOf(start);
  const endIdx = text.indexOf(end);
  if (startIdx === -1 || endIdx === -1) return '';
  const raw = text.substring(startIdx + start.length, endIdx).trim();
  return aggressiveClean(raw);
}

function aggressiveClean(text) {
  if (!text) return '';
  text = text.replace(/\d{8,}/g, '');
  text = text.replace(/\*?count:?\s*\d+\*?/gi, '');
  text = text.replace(/(\d)\1{4,}/g, '');
  text = text.replace(/[✓✗]/g, '');
  text = text.replace(/\*\*/g, '');
  text = text.replace(/^["']|["']$/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function enforceLength(text, max) {
  if (!text || text.length <= max) return text;
  return text.substring(0, max).replace(/\s+\S*$/, '').trim();
}

function parseMetadata(fullText) {
  return {
    seoTitle:    enforceLength(extractDelimited(fullText, 'SEO_TITLE'), 60),
    metaDesc:    enforceLength(extractDelimited(fullText, 'META_DESC'), 160),
    urlSlug:     extractDelimited(fullText, 'URL_SLUG'),
    primaryKw:   extractDelimited(fullText, 'PRIMARY_KW'),
    secondaryKw: extractDelimited(fullText, 'SECONDARY_KW'),
    categories:  extractDelimited(fullText, 'CATEGORIES'),
    tags:        extractDelimited(fullText, 'TAGS'),
    readTime:    extractDelimited(fullText, 'READ_TIME'),
    schemaType:  extractDelimited(fullText, 'SCHEMA_TYPE'),
  };
}

function parseImagePrompts(block5Text) {
  const sections = {
    midjourney: '',
    dalle: '',
    googleflow: '',
    negative: '',
    tip: ''
  };
  const markers = [
    { key: 'midjourney',  start: '🎨 MIDJOURNEY' },
    { key: 'dalle',       start: '📸 DALL-E 3' },
    { key: 'googleflow',  start: '⚡ GOOGLE FLOW' },
    { key: 'negative',    start: '🚫 NEGATIVE PROMPT' },
    { key: 'tip',         start: '💡 USAGE TIP' },
  ];
  
  markers.forEach((marker, i) => {
    const startIdx = block5Text.indexOf(marker.start);
    if (startIdx === -1) return;
    const contentStart = startIdx + marker.start.length;
    const nextMarker = markers[i + 1];
    const endIdx = nextMarker 
      ? block5Text.indexOf(nextMarker.start)
      : block5Text.length;
    sections[marker.key] = block5Text
      .substring(contentStart, endIdx === -1 ? undefined : endIdx)
      .replace(/^[\s:]+/, '')
      .trim();
  });
  
  return sections;
}

// ── Modular API Endpoints ───────────────────────────────────────────
app.post('/api/research', researchHandler);
app.post('/api/generate', generateHandler);

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

// ── NEW: Regenerate partial endpoints ───────────────────────────────

// Regenerate image prompt only (fast, ~5 seconds)
app.post('/api/regen-image', async (req, res) => {
  const { keyword, imageStyle, articleTitle } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const prompt = `Generate ONLY Output Block 5 (Featured Image Prompt) for:
Article title: "${articleTitle}"
Topic: "${keyword}"
Image style: ${imageStyle || 'photorealistic'}

Follow the Block 5 format exactly from your instructions.
Output ONLY the image prompt block — nothing else.`;

  try {
    const model = getModel();
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true, parsed: parseImagePrompts(fullText) })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Regenerate SEO metadata only
app.post('/api/regen-seo', async (req, res) => {
  const { keyword, articleTitle, articleExcerpt } = req.body;
  
  const prompt = `Generate ONLY Output Block 4 (SEO Metadata Package) for:
Article title: "${articleTitle}"
Topic: "${keyword}"
Article opening: "${articleExcerpt}"

Use EXACTLY these delimiters — output nothing outside them:

%%SEO_TITLE_START%%
[50-60 char title, plain text only]
%%SEO_TITLE_END%%

%%META_DESC_START%%
[150-160 char description, plain text only]
%%META_DESC_END%%

%%URL_SLUG_START%%
[slug]
%%URL_SLUG_END%%

%%PRIMARY_KW_START%%
[keyword]
%%PRIMARY_KW_END%%

%%SECONDARY_KW_START%%
[kw1, kw2, kw3, kw4, kw5]
%%SECONDARY_KW_END%%

%%CATEGORIES_START%%
[categories]
%%CATEGORIES_END%%

%%TAGS_START%%
[tags]
%%TAGS_END%%

%%READ_TIME_START%%
[X min read]
%%READ_TIME_END%%

%%SCHEMA_TYPE_START%%
[type]
%%SCHEMA_TYPE_END%%

Output ONLY the delimiter blocks. No other text. No character counts.`;

  try {
    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseMetadata(text);
    res.json({ success: true, metadata: parsed });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Regenerate article only (keeps existing SEO + image prompt)
app.post('/api/regen-article', async (req, res) => {
  const { keyword, tone, contentType, wordCount, audience } = req.body;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const brief = [
    keyword,
    audience ? `| audience: ${audience}` : '',
    tone ? `| tone: ${tone}` : '',
    contentType && contentType !== 'auto' ? `| type: ${contentType}` : '',
    wordCount ? `| wordCount: ${wordCount}` : '',
  ].filter(Boolean).join(' ');

  const prompt = `${brief}

Generate ONLY Output Blocks 1, 2, and 3 (SEO Brief, Outline, and Full Article).
Do NOT generate Block 4 or Block 5.`;

  try {
    const model = getModel();
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536,
      },
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
