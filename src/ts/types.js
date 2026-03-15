// ═══════════════════════════════════════════
// PROVIDER TYPES
// ═══════════════════════════════════════════
export const PROVIDER_MODELS = {
    claude: [
        'claude-sonnet-4-20250514',
        'claude-opus-4-20250514',
        'claude-haiku-4-5-20251001',
    ],
    openai: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
    ],
    gemini: [
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
    ],
};
export const PROVIDER_LABELS = {
    claude: 'Claude (Anthropic)',
    openai: 'GPT (OpenAI)',
    gemini: 'Gemini (Google)',
};
export const PROVIDER_KEY_PREFIX = {
    claude: 'sk-ant-',
    openai: 'sk-',
    gemini: 'AIza',
};
//# sourceMappingURL=types.js.map