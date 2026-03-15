// ═══════════════════════════════════════════
// API MODULE
// Hỗ trợ 3 provider: Claude, OpenAI, Gemini
// Mỗi provider có adapter riêng, interface chung
// ═══════════════════════════════════════════
// ───────────────────────────────────────────
// TOOL DEFINITION (dùng chung cho cả 3 provider)
// ───────────────────────────────────────────
const CALCULATE_TOOL_DESC = 'Tính toán phép tính toán học chính xác. Chỉ dùng số và ký hiệu + - * / ( ).';
const CALCULATE_TOOL_PARAMS = {
    equation: {
        type: 'string',
        description: 'Phép tính toán học. Ví dụ: (1280/1366)*100',
    },
    description: {
        type: 'string',
        description: 'Mô tả ngắn phép tính này tính gì',
    },
};
// ═══════════════════════════════════════════
// CLAUDE ADAPTER
// ═══════════════════════════════════════════
async function callClaude(config, messages, systemPrompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: 1500,
            system: systemPrompt,
            tools: [
                {
                    name: 'calculate',
                    description: CALCULATE_TOOL_DESC,
                    input_schema: {
                        type: 'object',
                        properties: CALCULATE_TOOL_PARAMS,
                        required: ['equation'],
                    },
                },
            ],
            messages,
        }),
    });
    const data = await response.json();
    if (data.error)
        throw new Error(`Claude: ${data.error.message}`);
    const toolCalls = data.content
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({
        id: b.id,
        name: b.name,
        equation: b.input['equation'] ?? '',
        description: b.input['description'],
    }));
    const textBlock = data.content.find((b) => b.type === 'text');
    return {
        stopReason: data.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
        text: textBlock?.text ?? '',
        toolCalls,
        rawContent: data.content,
    };
}
/**
 * Build messages kèm tool results cho Claude (lần gọi tiếp theo)
 */
export function buildClaudeMessagesWithResults(userPrompt, rawContent, toolResults) {
    return [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: rawContent },
        {
            role: 'user',
            content: toolResults.map((tr) => ({
                type: 'tool_result',
                tool_use_id: tr.toolCallId,
                content: tr.isError ? `Lỗi: ${tr.result}` : `Kết quả chính xác: ${tr.result}`,
                ...(tr.isError && { is_error: true }),
            })),
        },
    ];
}
// ═══════════════════════════════════════════
// OPENAI ADAPTER
// ═══════════════════════════════════════════
async function callOpenAI(config, messages, systemPrompt) {
    // Convert messages sang OpenAI format
    const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
        })),
    ];
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: 1500,
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'calculate',
                        description: CALCULATE_TOOL_DESC,
                        parameters: {
                            type: 'object',
                            properties: CALCULATE_TOOL_PARAMS,
                            required: ['equation'],
                        },
                    },
                },
            ],
            tool_choice: 'auto',
            messages: openaiMessages,
        }),
    });
    const data = await response.json();
    if (data.error)
        throw new Error(`OpenAI: ${data.error.message}`);
    const choice = data.choices?.[0];
    const message = choice?.message;
    const finishReason = choice?.finish_reason ?? 'stop';
    const toolCalls = (message?.tool_calls ?? []).map((tc) => {
        const args = JSON.parse(tc.function.arguments);
        return {
            id: tc.id,
            name: 'calculate',
            equation: args['equation'] ?? '',
            description: args['description'],
        };
    });
    // Lưu raw content dạng OpenAI để build history
    const rawContent = [
        { type: 'text', text: message?.content ?? '' },
        ...toolCalls.map((tc) => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: { equation: tc.equation, description: tc.description ?? '' },
        })),
    ];
    return {
        stopReason: finishReason === 'tool_calls' ? 'tool_use' : 'end_turn',
        text: message?.content ?? '',
        toolCalls,
        rawContent,
    };
}
/**
 * Build messages kèm tool results cho OpenAI
 */
export function buildOpenAIMessagesWithResults(systemPrompt, userPrompt, previousMessage, toolResults) {
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: previousMessage.content, tool_calls: previousMessage.tool_calls },
        ...toolResults.map((tr) => ({
            role: 'tool',
            tool_call_id: tr.toolCallId,
            content: tr.isError ? `Lỗi: ${tr.result}` : `Kết quả chính xác: ${tr.result}`,
        })),
    ];
}
// ═══════════════════════════════════════════
// GEMINI ADAPTER
// ═══════════════════════════════════════════
async function callGemini(config, messages, systemPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
    // Nếu messages đã ở dạng Gemini format (object[]) thì dùng luôn
    // Nếu là ChatMessage[] thông thường thì convert
    let contents;
    if (messages.length > 0 && 'parts' in messages[0]) {
        // Đã là Gemini format rồi — dùng thẳng
        contents = messages;
    }
    else {
        // Convert từ ChatMessage sang Gemini format
        contents = messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
        }));
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: [
                {
                    functionDeclarations: [
                        {
                            name: 'calculate',
                            description: CALCULATE_TOOL_DESC,
                            parameters: {
                                type: 'OBJECT',
                                properties: {
                                    equation: {
                                        type: 'STRING',
                                        description: CALCULATE_TOOL_PARAMS.equation.description,
                                    },
                                    description: {
                                        type: 'STRING',
                                        description: CALCULATE_TOOL_PARAMS.description.description,
                                    },
                                },
                                required: ['equation'],
                            },
                        },
                    ],
                },
            ],
        }),
    });
    const data = await response.json();
    if (data.error)
        throw new Error(`Gemini: ${data.error.message}`);
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const toolCalls = parts
        .filter((p) => p.functionCall)
        .map((p, i) => ({
        id: `gemini-tool-${Date.now()}-${i}`,
        name: p.functionCall.name,
        equation: p.functionCall.args['equation'] ?? '',
        description: p.functionCall.args['description'],
    }));
    const textPart = parts.find((p) => p.text);
    const finishReason = candidate?.finishReason ?? 'STOP';
    const rawContent = [
        { type: 'text', text: textPart?.text ?? '' },
        ...toolCalls.map((tc) => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: { equation: tc.equation },
        })),
    ];
    return {
        stopReason: finishReason === 'STOP' && toolCalls.length > 0 ? 'tool_use' : 'end_turn',
        text: textPart?.text ?? '',
        toolCalls,
        rawContent,
    };
}
/**
 * Build messages kèm function response cho Gemini
 */
export function buildGeminiMessagesWithResults(userPrompt, toolCalls, toolResults) {
    return [
        { role: 'user', parts: [{ text: userPrompt }] },
        {
            role: 'model',
            parts: toolCalls.map((tc) => ({
                functionCall: { name: tc.name, args: { equation: tc.equation } },
            })),
        },
        {
            role: 'user',
            parts: toolResults.map((tr, i) => ({
                functionResponse: {
                    name: toolCalls[i]?.name ?? 'calculate',
                    response: {
                        name: toolCalls[i]?.name ?? 'calculate',
                        content: tr.isError ? `Lỗi: ${tr.result}` : `Kết quả chính xác: ${tr.result}`,
                    },
                },
            })),
        },
    ];
}
// ═══════════════════════════════════════════
// UNIFIED API CALLER
// Gọi đúng adapter dựa theo provider
// ═══════════════════════════════════════════
export async function callAI(config, messages, systemPrompt) {
    switch (config.provider) {
        case 'claude':
            return callClaude(config, messages, systemPrompt);
        case 'openai':
            return callOpenAI(config, messages, systemPrompt);
        case 'gemini':
            return callGemini(config, messages, systemPrompt);
        default:
            throw new Error(`Provider không được hỗ trợ: ${config.provider}`);
    }
}
// ═══════════════════════════════════════════
// SYSTEM PROMPT (dùng chung cho cả 3 provider)
// ═══════════════════════════════════════════
export const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích tài chính. Chỉ dùng thông tin trong tài liệu được cung cấp, không dùng kiến thức bên ngoài.

Khi cần tính toán, hãy dùng tool calculate để tính chính xác thay vì tự tính nhẩm.

Trước khi đưa ra câu trả lời cuối, hãy tự kiểm tra:
- Đã dùng đúng dòng/cột trong bảng chưa?
- Đơn vị có nhất quán không?
- Lấy đúng năm/kỳ được hỏi chưa?

Nếu phát hiện lỗi, hãy tự sửa và dùng lại tool calculate với số liệu đúng.`;
//# sourceMappingURL=api.js.map