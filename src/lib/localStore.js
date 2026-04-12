export const STORAGE_KEYS = {
  OPENAI_KEY: "pension_ai_openai_key",
  OPENAI_MODEL: "pension_ai_openai_model",
  USER_PROFILES: "pension_ai_user_profiles",
  PENSION_DOCUMENTS: "pension_ai_pension_documents",
};

function safeParseJSON(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  return safeParseJSON(window.localStorage.getItem(key), fallback);
}

export function setJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getString(key, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

export function setString(key, value) {
  if (typeof window === "undefined") return;
  if (value == null || value === "") {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}