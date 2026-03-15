// ═══════════════════════════════════════════
// MAIN.TS — Entry point
// Kết nối tất cả các module lại
// Xử lý event listeners và orchestrate pipeline
// ═══════════════════════════════════════════
import { safeEval, formatNumber } from './calculator.js';
import { parseExcelFile, toMarkdownTable, renderTableHTML, getTableInfo } from './excel.js';
import { callAI, buildClaudeMessagesWithResults, buildGeminiMessagesWithResults, SYSTEM_PROMPT, } from './api.js';
import { setPipelineStep, resetPipeline, completePipeline, addUserMessage, addBotMessage, addThinkingIndicator, removeThinkingIndicator, addToolCard, addErrorMessage, updateStats, autoResizeTextarea, setSendButtonState, } from './ui.js';
// ═══════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════
const state = {
    provider: 'gemini', // dùng Gemini
    apiKey: '',
    model: 'gemini-2.5-flash', // model Gemini
    totalCalls: 0,
    totalCalcs: 0,
    totalQuestions: 0,
    excelData: null,
    isLoading: false,
};
// Trạng thái API key đã được xác nhận bằng Enter chưa
let apiKeyConfirmed = false;
// ═══════════════════════════════════════════
// API KEY — validate + xác nhận bằng Enter
// ═══════════════════════════════════════════
function isValidKey(key) {
    // Gemini key bắt đầu bằng AIza
    return key.length > 20 && key.startsWith('AIza');
}
function updateApiKeyUI(confirmed, valid) {
    const wrap = document.getElementById('api-key-wrap');
    const dot = document.getElementById('status-dot');
    const hint = document.getElementById('api-hint');
    if (!wrap || !dot || !hint)
        return;
    if (confirmed && valid) {
        // Đã xác nhận — hiển thị trạng thái xanh lá
        wrap.classList.add('api-confirmed');
        dot.className = 'w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 bg-emerald-400 shadow-sm shadow-emerald-300';
        hint.textContent = '✓ Đã xác nhận';
        hint.className = 'text-xs font-mono text-emerald-500 whitespace-nowrap';
    }
    else if (valid && !confirmed) {
        // Đã nhập đúng format nhưng chưa Enter
        wrap.classList.remove('api-confirmed');
        dot.className = 'w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 bg-amber-400';
        hint.textContent = '↵ Enter để xác nhận';
        hint.className = 'text-xs font-mono text-amber-400 whitespace-nowrap';
    }
    else {
        // Chưa nhập hoặc sai format
        wrap.classList.remove('api-confirmed');
        dot.className = 'w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 bg-slate-300';
        hint.textContent = '↵';
        hint.className = 'text-xs font-mono text-blue-200 whitespace-nowrap';
    }
    setSendButtonState(confirmed && valid && !state.isLoading);
}
function confirmApiKey() {
    const key = state.apiKey;
    if (isValidKey(key)) {
        apiKeyConfirmed = true;
        updateApiKeyUI(true, true);
        // Focus vào ô câu hỏi sau khi xác nhận
        const questionInput = document.getElementById('question-input');
        questionInput?.focus();
    }
    else {
        apiKeyConfirmed = false;
        updateApiKeyUI(false, false);
        // Shake animation báo lỗi
        const wrap = document.getElementById('api-key-wrap');
        wrap?.classList.add('border-red-300');
        setTimeout(() => wrap?.classList.remove('border-red-300'), 1000);
    }
}
// ═══════════════════════════════════════════
// EXCEL HANDLING
// ═══════════════════════════════════════════
function initExcelHandlers() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('excel-input');
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-active');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drop-active');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-active');
        const file = e.dataTransfer?.files[0];
        if (file)
            processFile(file);
    });
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file)
            processFile(file);
    });
    // Nút xóa file Excel
    document.getElementById('clear-excel-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearExcel();
    });
}
function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const buffer = e.target?.result;
            const data = parseExcelFile(buffer, file.name);
            state.excelData = data;
            renderSheetTabs(Object.keys(data.sheets));
            selectSheet(data.activeSheet);
            document.getElementById('table-text-wrap')?.classList.add('hidden');
            document.getElementById('table-preview')?.classList.remove('hidden');
            const dropZone = document.getElementById('drop-zone');
            dropZone.innerHTML = `
        <div class="text-xl mb-1">✅</div>
        <p class="text-xs text-blue-600 font-medium">${file.name}</p>
        <p class="text-xs text-blue-300 mt-0.5">${Object.keys(data.sheets).length} sheet · Nhấn để đổi file</p>`;
        }
        catch (err) {
            alert('Không đọc được file: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
        }
    };
    reader.readAsArrayBuffer(file);
}
function renderSheetTabs(sheets) {
    const wrap = document.getElementById('sheet-tabs');
    wrap.innerHTML = '';
    if (sheets.length > 1) {
        document.getElementById('sheet-selector')?.classList.remove('hidden');
        sheets.forEach((name) => {
            const btn = document.createElement('button');
            btn.className = 'sheet-tab text-xs font-mono px-2.5 py-1 rounded-lg';
            btn.textContent = name;
            btn.id = `tab-${name}`;
            btn.addEventListener('click', () => selectSheet(name));
            wrap.appendChild(btn);
        });
    }
    else {
        document.getElementById('sheet-selector')?.classList.add('hidden');
    }
}
function selectSheet(name) {
    if (!state.excelData)
        return;
    state.excelData.activeSheet = name;
    document.querySelectorAll('.sheet-tab').forEach((t) => t.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.add('active');
    const rows = state.excelData.sheets[name];
    if (!rows)
        return;
    const container = document.getElementById('table-container');
    container.innerHTML = renderTableHTML(rows);
    const info = document.getElementById('table-info');
    info.textContent = getTableInfo(rows);
}
function clearExcel() {
    state.excelData = null;
    document.getElementById('table-preview')?.classList.add('hidden');
    document.getElementById('table-text-wrap')?.classList.remove('hidden');
    document.getElementById('sheet-selector')?.classList.add('hidden');
    document.getElementById('excel-input').value = '';
    document.getElementById('drop-zone').innerHTML = `
    <div class="text-2xl mb-1">📊</div>
    <p class="text-xs text-blue-500 font-medium">Kéo thả hoặc nhấn để tải file</p>
    <p class="text-xs text-blue-300 mt-0.5">.xlsx · .xls · .csv</p>`;
}
// ═══════════════════════════════════════════
// SEND MESSAGE — MAIN PIPELINE
// ═══════════════════════════════════════════
async function sendMessage() {
    if (state.isLoading)
        return;
    const questionEl = document.getElementById('question-input');
    const textInput = document.getElementById('text-input');
    const tableInput = document.getElementById('table-input');
    const question = questionEl.value.trim();
    if (!question)
        return;
    // Build context
    const textContext = textInput.value.trim();
    const tableContext = state.excelData
        ? toMarkdownTable(state.excelData.sheets[state.excelData.activeSheet] ?? [])
        : tableInput.value.trim();
    const context = [
        textContext ? `Văn bản:\n${textContext}` : '',
        tableContext ? `Bảng số liệu:\n${tableContext}` : '',
    ]
        .filter(Boolean)
        .join('\n\n');
    if (!context.trim()) {
        addErrorMessage('Vui lòng nhập văn bản hoặc tải bảng số liệu ở panel bên trái.');
        return;
    }
    // Reset UI
    questionEl.value = '';
    questionEl.style.height = 'auto';
    state.isLoading = true;
    setSendButtonState(false);
    addUserMessage(question);
    resetPipeline();
    const userPrompt = `${context}\n\nCâu hỏi: ${question}`;
    const config = { provider: state.provider, apiKey: state.apiKey, model: state.model };
    state.totalCalls++;
    setPipelineStep(1, 'active');
    addThinkingIndicator('Analyst + i-Critic đang phân tích...');
    try {
        let messages = [{ role: 'user', content: userPrompt }];
        let finalAnswer = '';
        const allCalcResults = [];
        let iterations = 0;
        while (iterations < 5) {
            iterations++;
            const response = await callAI(config, messages, SYSTEM_PROMPT);
            if (response.stopReason === 'end_turn') {
                finalAnswer = response.text;
                break;
            }
            if (response.stopReason === 'tool_use' && response.toolCalls.length > 0) {
                removeThinkingIndicator();
                setPipelineStep(2, 'active');
                setPipelineStep(3, 'active');
                const toolResults = [];
                const newCalcResults = [];
                for (const tc of response.toolCalls) {
                    try {
                        const result = safeEval(tc.equation);
                        const formatted = formatNumber(result);
                        newCalcResults.push({ equation: tc.equation, result, formatted });
                        allCalcResults.push({ equation: tc.equation, result, formatted });
                        state.totalCalcs++;
                        toolResults.push({ toolCallId: tc.id, result, isError: false });
                    }
                    catch (e) {
                        toolResults.push({
                            toolCallId: tc.id,
                            result: e instanceof Error ? e.message : 'Lỗi',
                            isError: true,
                        });
                    }
                }
                if (newCalcResults.length > 0) {
                    addToolCard(newCalcResults);
                }
                // Build messages cho vòng lặp tiếp theo
                if (state.provider === 'claude') {
                    messages = buildClaudeMessagesWithResults(userPrompt, response.rawContent, toolResults);
                }
                else if (state.provider === 'gemini') {
                    messages = buildGeminiMessagesWithResults(userPrompt, response.toolCalls, toolResults);
                }
                else {
                    const resultSummary = toolResults
                        .map((tr, i) => `${response.toolCalls[i]?.equation}: ${tr.result}`)
                        .join(', ');
                    messages = [
                        { role: 'user', content: `${userPrompt}\n\n[Kết quả tính toán chính xác: ${resultSummary}]` },
                    ];
                }
                setPipelineStep(4, 'active');
                addThinkingIndicator('Đang viết kết luận...');
                state.totalCalls++;
                continue;
            }
            break;
        }
        removeThinkingIndicator();
        if (finalAnswer) {
            completePipeline();
            addBotMessage(finalAnswer);
            state.totalQuestions++;
        }
        updateStats(state.totalCalls, state.totalCalcs, state.totalQuestions);
    }
    catch (err) {
        removeThinkingIndicator();
        resetPipeline();
        addErrorMessage(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
    state.isLoading = false;
    // Khôi phục trạng thái nút gửi
    setSendButtonState(apiKeyConfirmed && isValidKey(state.apiKey) && !state.isLoading);
}
// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initExcelHandlers();
    // API key input
    const apiKeyInput = document.getElementById('api-key');
    // Gõ phím → update state + UI (chưa xác nhận)
    apiKeyInput.addEventListener('input', () => {
        state.apiKey = apiKeyInput.value.trim();
        apiKeyConfirmed = false;
        updateApiKeyUI(false, isValidKey(state.apiKey));
    });
    // Nhấn Enter → xác nhận API key
    apiKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmApiKey();
        }
    });
    // Question textarea
    const questionInput = document.getElementById('question-input');
    questionInput.addEventListener('input', () => autoResizeTextarea(questionInput));
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage();
        }
    });
    // Send button
    document.getElementById('send-btn')?.addEventListener('click', () => void sendMessage());
});
//# sourceMappingURL=main.js.map