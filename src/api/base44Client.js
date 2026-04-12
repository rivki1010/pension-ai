import { STORAGE_KEYS, getJson, getString, setJson, setString } from "@/lib/localStore";

const inMemoryFileCache = new Map();
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

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

async function callOpenAIResponses({ model, input }) {
  const apiKey = getString(STORAGE_KEYS.OPENAI_KEY, "").trim();
  if (!apiKey) {
    throw new Error("לא הוגדר מפתח API. היכנס לעמוד ההגדרות והזן OpenAI API Key.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || getString(STORAGE_KEYS.OPENAI_MODEL, DEFAULT_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL,
      input,
      text: {
        format: {
          type: "text",
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || "בקשת OpenAI נכשלה";
    throw new Error(message);
  }

  return data;
}

function extractTextFromResponse(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        parts.push(content.text);
      }
      if (content?.type === "text" && typeof content?.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function parseJsonFromText(rawText) {
  const trimmed = rawText.trim();
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
    const systemInstruction = [
      "Extract pension statement fields into JSON only.",
      "Return a single JSON object without markdown.",
      "If a field is missing, return null.",
      "Numbers must be plain numbers without currency symbols.",
    ].join(" ");

    const schemaHint = JSON.stringify(json_schema || {}, null, 2);

    let modelInput;
    if (file.type?.startsWith("image/")) {
      const dataUrl = await readFileAsDataURL(file);
      modelInput = [
        {
          role: "system",
          content: [{ type: "input_text", text: systemInstruction }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Use this JSON schema as target:\n${schemaHint}`,
            },
            {
              type: "input_image",
              image_url: dataUrl,
            },
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
        {
          role: "system",
          content: [{ type: "input_text", text: systemInstruction }],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Use this JSON schema as target:\n${schemaHint}`,
            },
            {
              type: "input_file",
              filename: file.name,
              file_data: dataUrl,
            },
          ],
        },
      ];
    } else {
      const text = await readFileAsText(file);
      modelInput = [
        {
          role: "system",
          content: [{ type: "input_text", text: systemInstruction }],
        },
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

    const response = await callOpenAIResponses({ input: modelInput });
    const rawText = extractTextFromResponse(response);
    const parsed = parseJsonFromText(rawText);

    return {
      status: "success",
      output: normalizeDocumentPayload(parsed),
      details: null,
    };
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
        const profiles = getProfiles();
        const profile = {
          ...data,
          id: createId("profile"),
          created_date: nowIso(),
          updated_date: nowIso(),
        };
        const next = [profile];
        saveProfiles(next);
        return profile;
      },
      async update(id, data) {
        const profiles = getProfiles();
        const index = profiles.findIndex((p) => p.id === id);
        if (index === -1) {
          const created = await this.create(data);
          return created;
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
        const profiles = getProfiles().filter((p) => p.id !== id);
        saveProfiles(profiles);
      },
    },

    PensionDocument: {
      async list(sortExpression) {
        const documents = getDocuments();
        return sortByExpression(documents, sortExpression);
      },
      async filter(criteria = {}) {
        const documents = getDocuments();
        return documents.filter((doc) =>
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
          const created = await this.create(data);
          return created;
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
        const documents = getDocuments().filter((doc) => doc.id !== id);
        saveDocuments(documents);
      },
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) {
          throw new Error("No file provided");
        }
        const fileUrl = URL.createObjectURL(file);
        inMemoryFileCache.set(fileUrl, file);
        return { file_url: fileUrl };
      },

      async ExtractDataFromUploadedFile({ file_url, json_schema }) {
        const file = inMemoryFileCache.get(file_url);
        return extractDataFromFileWithAI({ file, json_schema });
      },

      async InvokeLLM({ prompt, model }) {
        const response = await callOpenAIResponses({
          model,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: prompt }],
            },
          ],
        });
        return extractTextFromResponse(response);
      },
    },
  },

  auth: {
    async me() {
      const hasKey = Boolean(getString(STORAGE_KEYS.OPENAI_KEY, "").trim());
      if (!hasKey) {
        throw new Error("API key is missing");
      }
      const profiles = getProfiles();
      return {
        id: "local-user",
        role: "user",
        hasApiKey: hasKey,
        hasProfile: profiles.length > 0,
      };
    },

    logout() {
      setString(STORAGE_KEYS.OPENAI_KEY, "");
    },

    redirectToLogin() {
      window.location.hash = "#/settings";
    },
  },
};

export function getStoredOpenAIKey() {
  return getString(STORAGE_KEYS.OPENAI_KEY, "");
}

export function setStoredOpenAIKey(value) {
  setString(STORAGE_KEYS.OPENAI_KEY, value);
}

export function getStoredOpenAIModel() {
  return getString(STORAGE_KEYS.OPENAI_MODEL, DEFAULT_OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
}

export function setStoredOpenAIModel(model) {
  setString(STORAGE_KEYS.OPENAI_MODEL, model || DEFAULT_OPENAI_MODEL);
}