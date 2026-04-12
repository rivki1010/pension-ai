export const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4.1-mini" },
  { id: "anthropic", label: "Anthropic", defaultModel: "claude-3-7-sonnet-latest" },
  { id: "google", label: "Google Gemini", defaultModel: "gemini-2.0-flash" },
  { id: "openrouter", label: "OpenRouter", defaultModel: "openai/gpt-4.1-mini" },
  { id: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile" },
  { id: "custom", label: "OpenAI-Compatible (Custom)", defaultModel: "gpt-4.1-mini" },
];

export function getProviderById(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || AI_PROVIDERS[0];
}

export function defaultModelForProvider(providerId) {
  return getProviderById(providerId).defaultModel;
}
