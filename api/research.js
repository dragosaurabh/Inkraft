import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { search } from 'duck-duck-scrape';
import * as cheerio from 'cheerio';

const currentYear = new Date().getFullYear();

function getSystemPrompt() {
  const raw = readFileSync(
    join(process.cwd(), 'inkraft-system-prompt.txt'),
    'utf-8' // We reuse the base prompt, but we override instructions below
  );
  return raw + `\n\n---\n\n## YEAR CONTEXT\n\nThe current year is ${currentYear}. Always use ${currentYear} in article titles and content.\n`;
}

function getModel(userApiKey) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('API key is not set. Please add it in Settings.');
  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-2.5-flash since 2.5-pro might be unavailable in standard free tiers
  // but it's powerful enough to analyze 3 sites and write an outline.
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: getSystemPrompt(),
  });
}

function sendStatus(res, message) {
  res.write(`data: ${JSON.stringify({ type: 'status', message })}\n\n`);
}

function sendStream(res, text) {
  const encoded = text.replace(/\n/g, '\\n');
  res.write(`data: {"type":"stream", "text":"${encoded}"}\n\n`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { keyword, audience, tone, contentType, wordCount } = req.body;
  
  if (!keyword?.trim()) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // 1. Search Phase
    sendStatus(res, `Searching the web for "${keyword}"...`);
    const searchResults = await search(keyword, { safeSearch: search.SafeSearchType.MODERATE });
    
    // Grab top 3 normal search results (ignoring weird ones)
    const topResults = searchResults.results
      .filter(r => r.url && r.title && !r.url.includes('youtube.com'))
      .slice(0, 3);
      
    if (topResults.length === 0) {
      sendStatus(res, 'Could not find sufficient web results. Generating brief purely via AI...');
    }

    // 2. Scraping Phase
    let scrapedContext = '';
    for (let i = 0; i < topResults.length; i++) {
        sendStatus(res, `Reading competitor ${i + 1}/${topResults.length}: ${topResults[i].title.substring(0, 30)}...`);
        try {
            // Native node-fetch built into Node 18+
            const fetchRes = await fetch(topResults[i].url, { 
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, 
              signal: AbortSignal.timeout(4000) 
            });
            const html = await fetchRes.text();
            
            // Fast parsing with cheerio
            const $ = cheerio.load(html);
            $('script, style, nav, footer, header, aside, .sidebar, iframe').remove();
            
            // Clean up and limit to 5000 chars per site to prevent context blowout
            const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
            scrapedContext += `\n\n--- Source: ${topResults[i].url} (${topResults[i].title}) ---\n${text}\n`;
        } catch (err) {
            console.log(`Failed to scrape ${topResults[i].url}:`, err.message);
            // Non-fatal, keep going
        }
    }

    // 3. AI Analysis Phase
    sendStatus(res, 'Analyzing competitors and drafting Content Brief...');
    
    const prompt = `You are a world-class SEO strategist and Content Director.
I need you to create a "Content Brief" for a writer to write an article about "${keyword}".

We have scraped the top-ranking competitor pages for this keyword. 
Analyze them, identify what they are doing well, and identify content gaps or unique angles we can take to beat them.

Then, propose an extremely detailed Outline using standard Markdown headings (H2, H3).

Here is the context for the requested article:
Target Keyword: ${keyword}
Target Audience: ${audience || 'General'}
Tone of Voice: ${tone || 'Expert and Helpful'}
Content Type: ${contentType || 'Standard Blog Post'}

Available Competitor Content:
${scrapedContext || 'No competitor data available. Rely on your own knowledge.'}

OUTPUT FORMAT STRICT RULES:
You MUST output EXACTLY two sections separated by delimiters. Do not output anything outside these delimiters.

%%ANALYSIS_START%%
## Competitor Analysis
(Briefly summarize what the competitors did well and what they missed)

## Recommended Angle
(Suggest the best angle/hook for our article to stand out)
%%ANALYSIS_END%%

%%OUTLINE_START%%
# (Proposed Title)
Intro: (brief description of intro)
## (H2 Heading 1)
### (H3 Subheading)
### (H3 Subheading)
## (H2 Heading 2)
### (H3 Subheading)
Conclusion: (brief description of conclusion)
%%OUTLINE_END%%
`;

    const model = getModel(req.body.apiKey);
    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7, // slightly lower temp for analytical strictness
        maxOutputTokens: 8000,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        sendStream(res, text);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('Research API error:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
