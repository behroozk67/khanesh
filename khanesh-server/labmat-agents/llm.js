import "dotenv/config";

// AvalAI / OpenAI compatible API client
const API_KEY = process.env.AVALAI_API_KEY;
const BASE_URL = process.env.AVALAI_BASE_URL || "https://api.avalai.ir/v1";
const MODEL = process.env.AVALAI_MODEL || "gpt-4o-mini";

async function callLLM(systemPrompt, userPrompt, options = {}) {
  if (!API_KEY) {
    throw new Error("AVALAI_API_KEY is not set in .env");
  }

  const fetchImpl = options.fetch || fetch;
  const timeoutMs = options.timeout || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: options.max_tokens || 1000
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse JSON from LLM:", content);
      return null;
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`LLM request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export { callLLM };
