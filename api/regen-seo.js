import { GoogleGenerativeAI } from '@google/generative-ai';

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

function extractDelimited(text, fieldName) {
  const start = `%%${fieldName}_START%%`;
  const end = `%%${fieldName}_END%%`;
  const si = text.indexOf(start);
  const ei = text.indexOf(end);
  if (si === -1 || ei === -1) return '';
  return aggressiveClean(text.substring(si + start.length, ei).trim());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { keyword, articleTitle, articleExcerpt, apiKey: userApiKey } = req.body;
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'API key not set. Add it in Settings.' });

  const prompt = `Generate ONLY SEO metadata for:
Title: "${articleTitle}"
Topic: "${keyword}"
Opening: "${articleExcerpt}"

Use EXACTLY these delimiters:
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

Output ONLY the delimiter blocks. No other text.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    });
    const text = result.response.text();
    const metadata = {
      seoTitle:    enforceLength(extractDelimited(text, 'SEO_TITLE'), 60),
      metaDesc:    enforceLength(extractDelimited(text, 'META_DESC'), 160),
      urlSlug:     extractDelimited(text, 'URL_SLUG'),
      primaryKw:   extractDelimited(text, 'PRIMARY_KW'),
      secondaryKw: extractDelimited(text, 'SECONDARY_KW'),
      categories:  extractDelimited(text, 'CATEGORIES'),
      tags:        extractDelimited(text, 'TAGS'),
      readTime:    extractDelimited(text, 'READ_TIME'),
      schemaType:  extractDelimited(text, 'SCHEMA_TYPE'),
    };
    res.json({ success: true, metadata });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}
