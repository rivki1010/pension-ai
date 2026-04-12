import { STORAGE_KEYS, getJson, getString, setJson, setString } from "@/lib/localStore";
import { defaultModelForProvider } from "@/lib/aiProviders";

const inMemoryFileCache = new Map();

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortByExpression(items, sortExpression) {
  if (!sortExpression) return [...items];
  const isDesc = sortExpression.startsWith("-");
  const field = isDesc ? sortExpression.slice(1) : sortExpression;
  return [...items].sort((a, b) => {
    const aValue = a?.[field];
    const bValue = b?.[field];
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    if (aValue < bValue) return isDesc ? 1 : -1;
    if (aValue > bValue) return isDesc ? -1 : 1;
    return 0;
  });
}

function normalizeNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[,\s₪]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeDocumentPayload(payload) {
  return {
    provider_name: payload.provider_name || null,
    year: normalizeNumber(payload.year),
    total_balance: normalizeNumber(payload.total_balance),
    monthly_deposit: normalizeNumber(payload.monthly_deposit),
    employer_deposit: normalizeNumber(payload.employer_deposit),
    employee_deposit: normalizeNumber(payload.employee_deposit),
    annual_return_pct: normalizeNumber(payload.annual_return_pct),
    management_fee_pct: normalizeNumber(payload.management_fee_pct),
    management_fee_deposit_pct: normalizeNumber(payload.management_fee_deposit_pct),
    insurance_component: normalizeNumber(payload.insurance_component),
    severance_balance: normalizeNumber(payload.severance_balance),
    compensation_balance: normalizeNumber(payload.compensation_balance),
  };
}

function getProfiles() {
  return getJson(STORAGE_KEYS.USER_PROFILES, []);
}

function saveProfiles(profiles) {
  setJson(STORAGE_KEYS.USER_PROFILES, profiles);
}

function getDocuments() {
  return getJson(STORAGE_KEYS.PENSION_DOCUMENTS, []);
}

function saveDocuments(documents) {
  setJson(STORAGE_KEYS.PENSION_DOCUMENTS, documents);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Failed reading file as data URL"));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(reader.error || new Error("Failed reading file as text"));
    reader.readAsText(file);
  });
}

function getAISettings() {
  const provider = getString(STORAGE_KEYS.AI_PROVIDER, "openai") || "openai";
  const apiKey = getString(STORAGE_KEYS.AI_API_KEY, "").trim();
  const model = getString(STORAGE_KEYS.AI_MODEL, defaultModelForProvider(provider)) || defaultModelForProvider(provider);
  const baseUrl = getString(STORAGE_KEYS.AI_BASE_URL, "").trim();

  return {
    provider,
    apiKey,
    model,
    baseUrl,
  };
}

async function callOpenAIResponses({ model, input, apiKey }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      text: { format: { type: "text" } },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed");
  }

  const text =
    typeof data?.output_text === "string"
      ? data.output_text
      : (data?.output || [])
          .flatMap((item) => item?.content || [])
          .map((content) => content?.text)
          .filter(Boolean)
          .join("\n");

  return text?.trim() || "";
}

async function callAnthropic({ prompt, model, apiKey }) {
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Anthropic request failed");
  }

  return (data?.content || [])
    .map((item) => item?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function callGoogleGemini({ prompt, model, apiKey }) {
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini request failed");
  }

  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function callOpenAICompatible({ prompt, model, apiKey, baseUrl, provider }) {
  let endpoint = "";

  if (provider === "openrouter") endpoint = "https://openrouter.ai/api/v1/chat/completions";
  else if (provider === "groq") endpoint = "https://api.groq.com/openai/v1/chat/completions";
  else endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  if (!endpoint) {
    throw new Error("Missing compatible API endpoint");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(provider === "openrouter" ? { "HTTP-Referer": window.location.origin } : {}),
      ...(provider === "openrouter" ? { "X-Title": "Pension AI" } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Compatible provider request failed");
  }

  return data?.choices?.[0]?.message?.content?.trim() || "";
}

async function callTextModel({ prompt, modelOverride }) {
  const { provider, apiKey, model, baseUrl } = getAISettings();

  if (!apiKey) {
    throw new Error("לא הוגדר מפתח API. הזן מפתח בשלב הפרטים האישיים או במסך ההגדרות.");
  }

  const selectedModel = modelOverride || model || defaultModelForProvider(provider);

  if (provider === "openai") {
    return callOpenAIResponses({
      model: selectedModel,
      apiKey,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    });
  }

  if (provider === "anthropic") {
    return callAnthropic({ prompt, model: selectedModel, apiKey });
  }

  if (provider === "google") {
    return callGoogleGemini({ prompt, model: selectedModel, apiKey });
  }

  return callOpenAICompatible({
    prompt,
    model: selectedModel,
    apiKey,
    baseUrl,
    provider,
  });
}

function parseJsonFromText(rawText) {
  const trimmed = (rawText || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("לא התקבל JSON תקין מהמודל");
    }
    return JSON.parse(match[0]);
  }
}

async function extractDataFromFileWithAI({ file, json_schema }) {
  if (!file) {
    return {
      status: "error",
      details: "הקובץ לא נמצא בזיכרון. נסה להעלות אותו מחדש.",
    };
  }

  try {
    const { provider, model, apiKey } = getAISettings();
    const schemaHint = JSON.stringify(json_schema || {}, null, 2);

    if (provider === "openai") {
      const systemInstruction = [
        "Extract pension statement fields into JSON only.",
        "Return a single JSON object without markdown.",
        "If a field is missing, return null.",
        "Numbers must be plain numbers without currency symbols.",
      ].join(" ");

      let modelInput;
      if (file.type?.startsWith("image/")) {
        const dataUrl = await readFileAsDataURL(file);
        modelInput = [
          { role: "system", content: [{ type: "input_text", text: systemInstruction }] },
          {
            role: "user",
            content: [
              { type: "input_text", text: `Use this JSON schema as target:\n${schemaHint}` },
              { type: "input_image", image_url: dataUrl },
            ],
          },
        ];
      } else if (
        file.type?.includes("pdf") ||
        file.name?.toLowerCase().endsWith(".pdf") ||
        file.type?.includes("spreadsheet") ||
        file.name?.toLowerCase().endsWith(".xlsx") ||
        file.name?.toLowerCase().endsWith(".xls")
      ) {
        const dataUrl = await readFileAsDataURL(file);
        modelInput = [
          { role: "system", content: [{ type: "input_text", text: systemInstruction }] },
          {
            role: "user",
            content: [
              { type: "input_text", text: `Use this JSON schema as target:\n${schemaHint}` },
              { type: "input_file", filename: file.name, file_data: dataUrl },
            ],
          },
        ];
      } else {
        const text = await readFileAsText(file);
        modelInput = [
          { role: "system", content: [{ type: "input_text", text: systemInstruction }] },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Use this JSON schema as target:\n${schemaHint}\n\nDocument text:\n${text.slice(0, 200000)}`,
              },
            ],
          },
        ];
      }

      const rawText = await callOpenAIResponses({ model, input: modelInput, apiKey });
      const parsed = parseJsonFromText(rawText);
      return { status: "success", output: normalizeDocumentPayload(parsed), details: null };
    }

    const lowerName = file.name?.toLowerCase() || "";
    const isTextLike =
      file.type?.startsWith("text/") ||
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".json") ||
      lowerName.endsWith(".md");

    if (!isTextLike) {
      return {
        status: "error",
        details:
          "לספק שנבחר אין כרגע תמיכה ישירה ב-PDF/Excel בדפדפן. עבור מסמכים אלו עדיף לבחור OpenAI, או להעלות CSV/TXT.",
      };
    }

    const text = await readFileAsText(file);
    const prompt = [
      "Extract pension statement fields into JSON only.",
      "Return one JSON object and no markdown.",
      "Missing fields must be null.",
      "Numbers should be plain numbers.",
      `Target schema:\n${schemaHint}`,
      `Document text:\n${text.slice(0, 200000)}`,
    ].join("\n\n");

    const rawText = await callTextModel({ prompt });
    const parsed = parseJsonFromText(rawText);
    return { status: "success", output: normalizeDocumentPayload(parsed), details: null };
  } catch (error) {
    return {
      status: "error",
      details: error?.message || "שגיאה בפענוח המסמך",
    };
  }
}

export const base44 = {
  entities: {
    UserFinancialProfile: {
      async list() {
        return getProfiles();
      },
      async create(data) {
        const profile = {
          ...data,
          id: createId("profile"),
          created_date: nowIso(),
          updated_date: nowIso(),
        };
        saveProfiles([profile]);
        return profile;
      },
      async update(id, data) {
        const profiles = getProfiles();
        const index = profiles.findIndex((p) => p.id === id);
        if (index === -1) {
          return this.create(data);
        }

        const updated = {
          ...profiles[index],
          ...data,
          id,
          updated_date: nowIso(),
        };
        profiles[index] = updated;
        saveProfiles(profiles);
        return updated;
      },
      async delete(id) {
        saveProfiles(getProfiles().filter((p) => p.id !== id));
      },
    },

    PensionDocument: {
      async list(sortExpression) {
        return sortByExpression(getDocuments(), sortExpression);
      },
      async filter(criteria = {}) {
        return getDocuments().filter((doc) =>
          Object.entries(criteria).every(([key, value]) => doc?.[key] === value)
        );
      },
      async create(data) {
        const documents = getDocuments();
        const document = {
          ...data,
          id: createId("doc"),
          created_date: nowIso(),
          updated_date: nowIso(),
        };
        saveDocuments([document, ...documents]);
        return document;
      },
      async update(id, data) {
        const documents = getDocuments();
        const index = documents.findIndex((doc) => doc.id === id);
        if (index === -1) {
          return this.create(data);
        }

        const updated = {
          ...documents[index],
          ...data,
          id,
          updated_date: nowIso(),
        };
        documents[index] = updated;
        saveDocuments(documents);
        return updated;
      },
      async delete(id) {
        saveDocuments(getDocuments().filter((doc) => doc.id !== id));
      },
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) throw new Error("No file provided");
        const fileUrl = URL.createObjectURL(file);
        inMemoryFileCache.set(fileUrl, file);
        return { file_url: fileUrl };
      },

      async ExtractDataFromUploadedFile({ file_url, json_schema }) {
        const file = inMemoryFileCache.get(file_url);
        return extractDataFromFileWithAI({ file, json_schema });
      },

      async InvokeLLM({ prompt, model }) {
        return callTextModel({ prompt, modelOverride: model });
      },
    },
  },

  auth: {
    async me() {
      const hasKey = Boolean(getString(STORAGE_KEYS.AI_API_KEY, "").trim());
      if (!hasKey) {
        throw new Error("API key is missing");
      }

      return {
        id: "local-user",
        role: "user",
        hasApiKey: hasKey,
        hasProfile: getProfiles().length > 0,
      };
    },

    logout() {
      setString(STORAGE_KEYS.AI_API_KEY, "");
    },

    redirectToLogin() {
      window.location.hash = "#/settings";
    },
  },
};

export function getStoredAIProvider() {
  return getString(STORAGE_KEYS.AI_PROVIDER, "openai") || "openai";
}

export function setStoredAIProvider(provider) {
  setString(STORAGE_KEYS.AI_PROVIDER, provider || "openai");
}

export function getStoredAIKey() {
  return getString(STORAGE_KEYS.AI_API_KEY, "");
}

export function setStoredAIKey(value) {
  setString(STORAGE_KEYS.AI_API_KEY, value);
}

export function getStoredAIModel() {
  const provider = getStoredAIProvider();
  return getString(STORAGE_KEYS.AI_MODEL, defaultModelForProvider(provider)) || defaultModelForProvider(provider);
}

export function setStoredAIModel(model) {
  const provider = getStoredAIProvider();
  setString(STORAGE_KEYS.AI_MODEL, model || defaultModelForProvider(provider));
}

export function getStoredAIBaseUrl() {
  return getString(STORAGE_KEYS.AI_BASE_URL, "");
}

export function setStoredAIBaseUrl(baseUrl) {
  setString(STORAGE_KEYS.AI_BASE_URL, baseUrl || "");
}
