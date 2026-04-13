import {
  getStoredAIBaseUrl,
  getStoredAIKey,
  getStoredAIModel,
  getStoredAIProvider,
} from "@/api/base44Client";
import { defaultModelForProvider } from "@/lib/aiProviders";

function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) throw new Error("לא התקבל JSON תקין מהמודל");
    return JSON.parse(match[0]);
  }
}

function getAISettings() {
  const provider = getStoredAIProvider() || "openai";
  const apiKey = (getStoredAIKey() || "").trim();
  const model = (getStoredAIModel() || defaultModelForProvider(provider)).trim();
  const baseUrl = (getStoredAIBaseUrl() || "").trim();
  return { provider, apiKey, model, baseUrl };
}

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || "OpenAI request failed";
    if (response.status === 401) {
      throw new Error(`שגיאת הרשאה OpenAI (401): ${message}`);
    }
    throw new Error(message);
  }

  return payload?.choices?.[0]?.message?.content || "";
}

async function callAnthropic({ apiKey, model, prompt }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Anthropic request failed");
  }

  return (payload?.content || [])
    .map((item) => item?.text)
    .filter(Boolean)
    .join("\n");
}

async function callGoogleGemini({ apiKey, model, prompt }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini request failed");
  }

  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text)
    .filter(Boolean)
    .join("\n");
}

async function callOpenAICompatible({ provider, apiKey, model, baseUrl, prompt }) {
  let endpoint = "";
  if (provider === "openrouter") endpoint = "https://openrouter.ai/api/v1/chat/completions";
  else if (provider === "groq") endpoint = "https://api.groq.com/openai/v1/chat/completions";
  else endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  if (!endpoint) {
    throw new Error("Missing compatible provider endpoint (Base URL)");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(provider === "openrouter" ? { "HTTP-Referer": window.location.origin } : {}),
      ...(provider === "openrouter" ? { "X-Title": "Pension AI" } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Compatible provider request failed");
  }

  return payload?.choices?.[0]?.message?.content || "";
}

async function callModelWithProvider(prompt) {
  const { provider, apiKey, model, baseUrl } = getAISettings();
  if (!apiKey) {
    throw new Error("לא נמצא מפתח API. הוסף מפתח במסך ההגדרות או בשלב הפרטים האישיים.");
  }

  if (provider === "openai") {
    return callOpenAI({ apiKey, model, prompt });
  }
  if (provider === "anthropic") {
    return callAnthropic({ apiKey, model, prompt });
  }
  if (provider === "google") {
    return callGoogleGemini({ apiKey, model, prompt });
  }

  return callOpenAICompatible({ provider, apiKey, model, baseUrl, prompt });
}

export async function extractDataWithAI(text, documentType) {
  const prompt = `
You are a financial data extractor.
I will provide text extracted from an Israeli ${
    documentType === "pension" ? "Pension" : "Education Fund"
  } report.

Return ONLY a valid JSON object with these keys:
- provider_name (string|null)
- year (number|null)
- total_balance (number|null)
- monthly_deposit (number|null)
- employer_deposit (number|null)
- employee_deposit (number|null)
- annual_return_pct (number|null)
- management_fee_pct (number|null)
- management_fee_deposit_pct (number|null)
- insurance_component (number|null)
- severance_balance (number|null)
- compensation_balance (number|null)

Rules:
- If missing: use null.
- Numbers must be plain numbers without commas/currency symbols.
- annual_return_pct should be percent value (example: 12.5).

Text:
${String(text || "").slice(0, 5000)}
`;

  const rawContent = await callModelWithProvider(prompt);
  return safeJSONParse(rawContent);
}
