require('dotenv').config();

// AvalAI / OpenAI compatible API client
const API_KEY = process.env.AVALAI_API_KEY;
const BASE_URL = "https://api.avalai.ir/v1";

async function callLLM(systemPrompt, userPrompt) {
  if (!API_KEY) {
    throw new Error("AVALAI_API_KEY is not set in .env");
  }

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // fallback to mini for speed/cost, avalai might support it or similar
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
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
}

module.exports = { callLLM };
