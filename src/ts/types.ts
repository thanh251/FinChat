// ═══════════════════════════════════════════
// PROVIDER TYPES
// ═══════════════════════════════════════════

export type AIProvider = 'claude' | 'openai' | 'gemini';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
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

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'GPT (OpenAI)',
  gemini: 'Gemini (Google)',
};

export const PROVIDER_KEY_PREFIX: Record<AIProvider, string> = {
  claude: 'sk-ant-',
  openai: 'sk-',
  gemini: 'AIza',
};

// ═══════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

export type MessageContent =
  | TextContent
  | ToolUseContent
  | ToolResultContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, string>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// ═══════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════

export interface APIResponse {
  stopReason: 'end_turn' | 'tool_use';
  text: string;
  toolCalls: ToolCall[];
  rawContent: MessageContent[]; // cần để build conversation history
}

export interface ToolCall {
  id: string;
  name: string;
  equation: string;
  description?: string;
}

export interface ToolResult {
  toolCallId: string;
  result: number | string;
  isError: boolean;
}

// ═══════════════════════════════════════════
// EXCEL TYPES
// ═══════════════════════════════════════════

export interface ExcelData {
  sheets: Record<string, CellRow[]>;
  activeSheet: string;
  fileName: string;
}

export type CellRow = (string | number | boolean | null)[];

// ═══════════════════════════════════════════
// APP STATE TYPES
// ═══════════════════════════════════════════

export interface AppState {
  provider: AIProvider;
  apiKey: string;
  model: string;
  totalCalls: number;
  totalCalcs: number;
  totalQuestions: number;
  excelData: ExcelData | null;
  isLoading: boolean;
}

export type PipelineStep = 1 | 2 | 3 | 4;
export type PipelineState = 'idle' | 'active' | 'done';
