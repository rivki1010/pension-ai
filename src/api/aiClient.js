function getOpenAIKey() {
  return (
    localStorage.getItem("openai_api_key") ||
    localStorage.getItem("pension_ai_ai_api_key") ||
    ""
  ).trim();
}

function getOpenAIModel() {
  return (
    localStorage.getItem("openai_model") ||
    localStorage.getItem("pension_ai_ai_model") ||
    "gpt-4o-mini"
  ).trim();
}

function safeJSONParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return valid JSON");
    return JSON.parse(match[0]);
  }
}

export async function extractDataWithAI(text, documentType) {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new Error("Missing API key. Please add your OpenAI key first.");
  }

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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "OpenAI request failed");
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response content returned from OpenAI");
  }

  return safeJSONParse(content);
}
