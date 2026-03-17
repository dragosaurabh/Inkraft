export default function handler(req, res) {
  const hasKey = !!(process.env.GEMINI_API_KEY);
  res.json({ status: 'ok', apiKeyConfigured: hasKey });
}
