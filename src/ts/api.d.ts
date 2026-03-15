import type { ProviderConfig, APIResponse, ChatMessage, ToolCall, ToolResult, MessageContent } from './types.js';
/**
 * Build messages kèm tool results cho Claude (lần gọi tiếp theo)
 */
export declare function buildClaudeMessagesWithResults(userPrompt: string, rawContent: MessageContent[], toolResults: ToolResult[]): ChatMessage[];
/**
 * Build messages kèm tool results cho OpenAI
 */
export declare function buildOpenAIMessagesWithResults(systemPrompt: string, userPrompt: string, previousMessage: {
    content: string;
    tool_calls: object[];
}, toolResults: ToolResult[]): object[];
/**
 * Build messages kèm function response cho Gemini
 */
export declare function buildGeminiMessagesWithResults(userPrompt: string, toolCalls: ToolCall[], toolResults: ToolResult[]): object[];
export declare function callAI(config: ProviderConfig, messages: ChatMessage[], systemPrompt: string): Promise<APIResponse>;
export declare const SYSTEM_PROMPT = "B\u1EA1n l\u00E0 chuy\u00EAn gia ph\u00E2n t\u00EDch t\u00E0i ch\u00EDnh. Ch\u1EC9 d\u00F9ng th\u00F4ng tin trong t\u00E0i li\u1EC7u \u0111\u01B0\u1EE3c cung c\u1EA5p, kh\u00F4ng d\u00F9ng ki\u1EBFn th\u1EE9c b\u00EAn ngo\u00E0i.\n\nKhi c\u1EA7n t\u00EDnh to\u00E1n, h\u00E3y d\u00F9ng tool calculate \u0111\u1EC3 t\u00EDnh ch\u00EDnh x\u00E1c thay v\u00EC t\u1EF1 t\u00EDnh nh\u1EA9m.\n\nTr\u01B0\u1EDBc khi \u0111\u01B0a ra c\u00E2u tr\u1EA3 l\u1EDDi cu\u1ED1i, h\u00E3y t\u1EF1 ki\u1EC3m tra:\n- \u0110\u00E3 d\u00F9ng \u0111\u00FAng d\u00F2ng/c\u1ED9t trong b\u1EA3ng ch\u01B0a?\n- \u0110\u01A1n v\u1ECB c\u00F3 nh\u1EA5t qu\u00E1n kh\u00F4ng?\n- L\u1EA5y \u0111\u00FAng n\u0103m/k\u1EF3 \u0111\u01B0\u1EE3c h\u1ECFi ch\u01B0a?\n\nN\u1EBFu ph\u00E1t hi\u1EC7n l\u1ED7i, h\u00E3y t\u1EF1 s\u1EEDa v\u00E0 d\u00F9ng l\u1EA1i tool calculate v\u1EDBi s\u1ED1 li\u1EC7u \u0111\u00FAng.";
