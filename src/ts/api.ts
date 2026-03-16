// ═══════════════════════════════════════════
// API MODULE
// Hỗ trợ 3 provider: Claude, OpenAI, Gemini
// Mỗi provider có adapter riêng, interface chung
// ═══════════════════════════════════════════

import type {
  AIProvider,
  ProviderConfig,
  APIResponse,
  ChatMessage,
  ToolCall,
  ToolResult,
  MessageContent,
} from './types.js';

// ───────────────────────────────────────────
// TOOL DEFINITION
// ───────────────────────────────────────────

const CALCULATE_TOOL_DESC =
  'Tính toán phép tính toán học chính xác. Chỉ dùng số và ký hiệu + - * / ( ) ** .';

const CALCULATE_TOOL_PARAMS = {
  equation: {
    type: 'string',
    description: 'Phép tính toán học. Ví dụ: (1280/1366)*100 hoặc (920-95)',
  },
  description: {
    type: 'string',
    description: 'Mô tả ngắn phép tính này tính gì',
  },
};

// ═══════════════════════════════════════════
// CLAUDE ADAPTER
// ═══════════════════════════════════════════

async function callClaude(
  config: ProviderConfig,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<APIResponse> {
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
      max_tokens: 2000,
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
  if (data.error) throw new Error(`Claude: ${data.error.message}`);

  const toolCalls: ToolCall[] = (data.content as MessageContent[])
    .filter((b): b is Extract<MessageContent, { type: 'tool_use' }> => b.type === 'tool_use')
    .map((b) => ({
      id: b.id,
      name: b.name,
      equation: b.input['equation'] ?? '',
      description: b.input['description'],
    }));

  const textBlock = (data.content as MessageContent[]).find(
    (b): b is Extract<MessageContent, { type: 'text' }> => b.type === 'text'
  );

  return {
    stopReason: data.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
    text: textBlock?.text ?? '',
    toolCalls,
    rawContent: data.content as MessageContent[],
  };
}

export function buildClaudeMessagesWithResults(
  userPrompt: string,
  rawContent: MessageContent[],
  toolResults: ToolResult[]
): ChatMessage[] {
  return [
    { role: 'user', content: userPrompt },
    { role: 'assistant', content: rawContent },
    {
      role: 'user',
      content: toolResults.map((tr) => ({
        type: 'tool_result' as const,
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

async function callOpenAI(
  config: ProviderConfig,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<APIResponse> {
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
      max_tokens: 2000,
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
  if (data.error) throw new Error(`OpenAI: ${data.error.message}`);

  const choice = data.choices?.[0];
  const message = choice?.message;
  const finishReason: string = choice?.finish_reason ?? 'stop';

  const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map(
    (tc: { id: string; function: { arguments: string } }) => {
      const args = JSON.parse(tc.function.arguments) as Record<string, string>;
      return {
        id: tc.id,
        name: 'calculate',
        equation: args['equation'] ?? '',
        description: args['description'],
      };
    }
  );

  const rawContent: MessageContent[] = [
    { type: 'text', text: message?.content ?? '' },
    ...toolCalls.map((tc) => ({
      type: 'tool_use' as const,
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

export function buildOpenAIMessagesWithResults(
  systemPrompt: string,
  userPrompt: string,
  previousMessage: { content: string; tool_calls: object[] },
  toolResults: ToolResult[]
): object[] {
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

async function callGemini(
  config: ProviderConfig,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<APIResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  let contents: object[];
  if (messages.length > 0 && 'parts' in (messages[0] as object)) {
    contents = messages as unknown as object[];
  } else {
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
  if (data.error) throw new Error(`Gemini: ${data.error.message}`);

  const candidate = data.candidates?.[0];
  const parts: Array<{
    text?: string;
    functionCall?: { name: string; args: Record<string, string> };
    functionResponse?: object;
  }> = candidate?.content?.parts ?? [];

  const toolCalls: ToolCall[] = parts
    .filter((p) => p.functionCall)
    .map((p, i) => ({
      id: `gemini-tool-${Date.now()}-${i}`,
      name: p.functionCall!.name,
      equation: p.functionCall!.args['equation'] ?? '',
      description: p.functionCall!.args['description'],
    }));

  const textPart = parts.find((p) => p.text);
  const finishReason: string = candidate?.finishReason ?? 'STOP';

  const rawContent: MessageContent[] = [
    { type: 'text', text: textPart?.text ?? '' },
    ...toolCalls.map((tc) => ({
      type: 'tool_use' as const,
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

export function buildGeminiMessagesWithResults(
  userPrompt: string,
  toolCalls: ToolCall[],
  toolResults: ToolResult[]
): object[] {
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
// ═══════════════════════════════════════════

export async function callAI(
  config: ProviderConfig,
  messages: ChatMessage[],
  systemPrompt: string
): Promise<APIResponse> {
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
// SYSTEM PROMPT — tối ưu cho TATQA + FinQA
// Bao gồm tất cả dạng câu hỏi đã phân tích
// ═══════════════════════════════════════════

export const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích tài chính. Nhiệm vụ của bạn là trả lời câu hỏi dựa HOÀN TOÀN vào bảng số liệu và văn bản được cung cấp. Không dùng kiến thức bên ngoài.

## NGUYÊN TẮC TÍNH TOÁN

Với MỌI phép tính số học, bắt buộc dùng tool calculate thay vì tự tính nhẩm. Điều này bao gồm:
- Phép cộng, trừ, nhân, chia đơn giản
- Tính phần trăm và % thay đổi
- Tính trung bình (average)
- Tính tăng trưởng kép (CAGR)
- Tính tỷ lệ và tỷ số
- Phép tính nhiều bước (kết quả bước trước làm đầu vào bước sau)

## CÁCH XỬ LÝ CÁC DẠNG CÂU HỎI

### 1. Thay đổi tuyệt đối
"What is the change in X from Y to Z?"
→ Tính: giá_trị_mới - giá_trị_cũ
→ Ví dụ: calculate("44.1 - 56.7")

### 2. Thay đổi phần trăm (% change)
"What is the percentage change in X?"
→ Tính: (giá_trị_mới - giá_trị_cũ) / giá_trị_cũ
→ Kết quả là tỷ lệ thập phân, nhân 100 để ra %
→ Ví dụ: calculate("(44.1 - 56.7) / 56.7") → rồi nhân 100

### 3. Trung bình (average)
"What is the average of X for years A, B, C?"
→ Tính: (X_A + X_B + X_C) / số_năm
→ Ví dụ: calculate("(166 + 178) / 2")

QUAN TRỌNG — Nếu từng giá trị X_A, X_B, X_C cần tính trước (không có sẵn trong bảng):
→ KHÔNG tự nhẩm kết quả trung gian
→ Tính từng giá trị bằng calculate, ghi nhớ kết quả số, rồi gọi calculate lần cuối để tính trung bình
→ Ví dụ câu "Average FCF/Net Income ratio 2021-2023":
   Bước 1: calculate("1456.8 / 1765.4 * 100") → 82.52
   Bước 2: calculate("1789.3 / 2196.8 * 100") → 81.45
   Bước 3: calculate("2134.6 / 2481.7 * 100") → 86.01
   Bước 4: calculate("(82.52 + 81.45 + 86.01) / 3") → 83.33  ← BẮT BUỘC gọi bước này
→ KHÔNG được tự cộng và chia trong đầu ở bước cuối

### 4. Tỷ lệ / tỷ số (ratio)
"What percentage of X is Y?" hoặc "What is X as a % of Y?"
→ Tính: X / Y (kết quả nhân 100 nếu hỏi %)
→ Ví dụ: calculate("1280 / 1366")

### 5. Phép tính nhiều bước (multi-step)
Khi câu hỏi yêu cầu nhiều bước, gọi calculate nhiều lần:
- Bước 1: tính kết quả trung gian
- Bước 2: dùng kết quả bước 1 trong phép tính tiếp theo
→ Ví dụ: calculate("920 - 95") → ra 825, rồi calculate("469 - 77") → ra 392, rồi calculate("(392 - 825) / 825")

### 6. Tăng trưởng kép CAGR
"What is the CAGR from year A to year B?"
→ Tính: (giá_trị_cuối / giá_trị_đầu) ** (1 / số_năm) - 1
→ Ví dụ: calculate("(5525 / 4018) ** (1/2) - 1")

### 7. Câu hỏi so sánh / xếp hạng
"Which is the largest / smallest?" hoặc "Rank X, Y, Z"
→ Tính từng giá trị riêng lẻ bằng calculate, sau đó so sánh

### 8. Câu hỏi không có đủ thông tin
Nếu bảng hoặc văn bản không cung cấp đủ số liệu để trả lời, hãy nói rõ:
"Không đủ thông tin trong tài liệu để trả lời câu hỏi này."
Không được tự bịa số hoặc dùng kiến thức bên ngoài.

## XỬ LÝ ĐƠN VỊ VÀ SCALE

Chú ý đơn vị ghi trong bảng (millions, thousands, billions, percent):
- Nếu bảng ghi "in millions" thì số 1,452 nghĩa là 1,452 triệu
- Giữ nguyên đơn vị khi trả lời, không tự đổi đơn vị
- Nếu câu hỏi hỏi theo đơn vị khác, ghi rõ đã quy đổi

## KIỂM TRA TRƯỚC KHI TRẢ LỜI

Sau khi có kết quả, tự kiểm tra:
1. Đã lấy đúng dòng và cột trong bảng chưa?
2. Đúng năm/kỳ được hỏi chưa?
3. Đơn vị có nhất quán không?
4. Kết quả có hợp lý về mặt tài chính không?

Nếu phát hiện lỗi, tự sửa và dùng lại tool calculate với số liệu đúng.`;
