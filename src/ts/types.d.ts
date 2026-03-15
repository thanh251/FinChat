export type AIProvider = 'claude' | 'openai' | 'gemini';
export interface ProviderConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
}
export declare const PROVIDER_MODELS: Record<AIProvider, string[]>;
export declare const PROVIDER_LABELS: Record<AIProvider, string>;
export declare const PROVIDER_KEY_PREFIX: Record<AIProvider, string>;
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string | MessageContent[];
}
export type MessageContent = TextContent | ToolUseContent | ToolResultContent;
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
export interface APIResponse {
    stopReason: 'end_turn' | 'tool_use';
    text: string;
    toolCalls: ToolCall[];
    rawContent: MessageContent[];
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
export interface ExcelData {
    sheets: Record<string, CellRow[]>;
    activeSheet: string;
    fileName: string;
}
export type CellRow = (string | number | boolean | null)[];
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
