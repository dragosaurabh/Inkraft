<div align="center">

# ✦ Inkraft

### AI Blog Article Engine — Powered by Google Gemini

Generate complete, publish-ready blog articles that rank on Google.
One keyword. Five outputs. Zero editing required.

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.5-blue.svg)](https://ai.google.dev)
[![GitHub Stars](https://img.shields.io/github/stars/dragosaurabh/Inkraft?style=social)](https://github.com/dragosaurabh/Inkraft/stargazers)

**[⚡ Try the live demo](https://inkraft.up.railway.app)** · 
**[⭐ Star on GitHub](https://github.com/dragosaurabh/Inkraft)**

</div>

---

## What is Inkraft?

Inkraft is an open-source AI blog writing engine that generates complete, SEO-optimised blog articles from a single keyword. Unlike basic AI writing tools, Inkraft produces a full content package — article, metadata, outline, SEO analysis, and featured image prompts — all in one generation.

Built for bloggers, content marketers, SEO professionals, and anyone who publishes content regularly.

---

## What You Get (5 Outputs Per Generation)

| Output | What It Contains |
|--------|-----------------|
| **Full Article** | 3,000–5,000 words, human-voiced, ready to publish |
| **SEO Intelligence Brief** | Search intent, semantic entity map, competitor gap analysis |
| **Article Outline** | Complete H2/H3 structure with word count targets |
| **SEO Metadata** | Title (50-60 chars), meta description (150-160 chars), slug, keywords, schema |
| **Featured Image Prompt** | Platform-specific prompts for Midjourney, DALL-E 3, and Google ImageFX |

---

## Features

**Content Generation**
- Streams output live as Gemini writes — no waiting for the full response
- Minimum 3,500 words for listicles, 5,000 for ultimate guides
- Human-voice rules: burstiness, perplexity, opinionation, no AI clichés
- E-E-A-T signals built into every article
- Callout boxes (Pro Tip, Watch Out, Quick Win) rendered inline
- FAQ section targeting Google's People Also Ask boxes

**SEO Tools**
- Editable SEO title and meta description with live character counter
- Visual bar showing good/warn/over-limit status
- One-click Copy All Metadata
- WordPress HTML export — paste directly into Classic Editor

**Image Generation**
- 6 visual styles: Photorealistic, Flat Illustration, Cinematic, Corporate Clean, Abstract Art, Isometric 3D
- Separate optimised prompts for Midjourney, DALL-E 3, and Google ImageFX/Flow
- Negative prompt included for each style

**App Features**
- V1 (dark) and V2 (light) themes — toggle anytime, persists across sessions
- Partial regeneration — refresh just the image prompt or SEO metadata without rewriting the full article
- Section-level rewrite — hover any H2 heading to rewrite just that section
- Article history — last 20 articles saved locally with search
- Quality score (0–100) based on word count, structure, and content completeness
- Reading progress bar while scrolling the article
- Fully responsive — works on mobile, tablet, laptop, and desktop
- Keyboard shortcut: ⌘ + Enter to generate

---

## Screenshots

> V2 Light Mode — Input form with image style picker

> V2 Light Mode — Full Article tab (4,350 words, Quality 100/100)

> V2 Light Mode — SEO Metadata with character validation

> V2 Light Mode — Featured Image Prompt (Isometric 3D style)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (no framework) |
| Backend | Node.js + Express |
| AI Model | Google Gemini 2.5 Flash |
| AI SDK | `@google/generative-ai` |
| Streaming | Server-Sent Events (SSE) |

---

## Deploy in One Click

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/Inkraft)

> After deploying, set your `GEMINI_API_KEY` environment variable 
> in the Railway dashboard under Settings → Variables.

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- A free Gemini API key — get one at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Setup
```bash
# Clone the repository
git clone https://github.com/dragosaurabh/Inkraft.git
cd Inkraft

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Open .env and paste your GEMINI_API_KEY

# Start the server
npm start

# Open in your browser
# → http://localhost:3000
```

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

---

## How to Use

1. **Enter a keyword** — e.g. `Best Shopify alternatives for small businesses`
2. **Set options** (optional) — audience, tone, content type, word count, image style
3. **Click Generate Article** — or press ⌘/Ctrl + Enter
4. **Watch it stream** — all 5 tabs populate live as Gemini writes
5. **Copy your content**:
   - Full Article tab → Copy WordPress HTML (paste directly into WordPress)
   - SEO Metadata tab → Copy All Metadata
   - Image Prompt tab → Copy the prompt for your preferred platform

---

## Cost Estimate

Inkraft uses the Gemini API which charges per token.

| Generation | Approx. Cost |
|------------|-------------|
| Standard article (3,500 words) | ~$0.002 |
| Long-form article (5,000 words) | ~$0.004 |
| Image prompt only (regen) | ~$0.0002 |

Google provides **$300 in free credits** for new Google Cloud accounts — enough for thousands of articles.

---

## Project Structure

```
Inkraft/
├── public/
│   ├── index.html              # Main UI
│   ├── app.js                  # Frontend logic
│   └── style.css               # All styles (V1 + V2 themes)
├── inkraft-system-prompt.txt   # The AI system prompt (Version 3.0)
├── server.js                   # Express server + Gemini API
├── .env.example                # Environment template
├── package.json
└── README.md
```

---

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

For major changes, please open an issue first to discuss what you'd like to change.

---

## Roadmap

- [x] One-click deploy to Railway / Render
- [ ] Bulk generation (multiple keywords at once)
- [ ] WordPress direct publish via REST API
- [ ] Article export as .docx
- [ ] Custom tone profiles (save and reuse)
- [ ] Multi-language support

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by [@dragosaurabh](https://github.com/dragosaurabh)

**If Inkraft saves you time, please ⭐ star the repo**

</div>
