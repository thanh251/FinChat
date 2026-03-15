// ═══════════════════════════════════════════
// UI MODULE
// Render messages, pipeline, tool cards
// Không có logic nghiệp vụ ở đây
// ═══════════════════════════════════════════

import type { PipelineStep, PipelineState } from './types.js';
import type { CalcResult } from './calculator.js';

// ───────────────────────────────────────────
// PIPELINE
// ───────────────────────────────────────────

export function setPipelineStep(step: PipelineStep, state: PipelineState): void {
  for (let i = 1 as PipelineStep; i <= 4; i++) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;

    const badge = el.querySelector<HTMLSpanElement>('span:last-child');

    if (i < step || (i === step && state === 'done')) {
      // Done
      el.className =
        'pipeline-step flex items-center gap-2.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs';
      if (badge)
        badge.className =
          'text-xs font-mono bg-emerald-100 border border-emerald-200 text-emerald-600 px-1.5 py-0.5 rounded';
    } else if (i === step && state === 'active') {
      // Active
      el.className =
        'pipeline-step flex items-center gap-2.5 px-3 py-2 rounded-lg border border-blue-300 bg-blue-100 text-blue-700 text-xs';
      if (badge)
        badge.className = 'text-xs font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded';
    } else {
      // Idle
      el.className =
        'pipeline-step flex items-center gap-2.5 px-3 py-2 rounded-lg border border-blue-100 bg-blue-50 text-slate-400 text-xs';
      if (badge)
        badge.className =
          'text-xs font-mono bg-white border border-blue-100 text-blue-300 px-1.5 py-0.5 rounded';
    }
  }
}

export function resetPipeline(): void {
  setPipelineStep(1 as PipelineStep, 'idle');
}

export function completePipeline(): void {
  for (let i = 1 as PipelineStep; i <= 4; i++) {
    setPipelineStep(i, 'done');
  }
}

// ───────────────────────────────────────────
// MESSAGES
// ───────────────────────────────────────────

function getMessagesContainer(): HTMLElement {
  return document.getElementById('messages')!;
}

function scrollToBottom(): void {
  const m = getMessagesContainer();
  m.scrollTop = m.scrollHeight;
}

function removeWelcome(): void {
  const w = document.getElementById('welcome');
  if (w) w.remove();
}

function now(): string {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function addUserMessage(text: string): void {
  removeWelcome();
  const msgs = getMessagesContainer();
  const div = document.createElement('div');
  div.className = 'flex flex-col items-end gap-1';
  div.innerHTML = `
    <span class="text-xs font-mono text-blue-300 pr-1">${now()}</span>
    <div class="bubble-user max-w-lg bg-blue-600 text-white px-4 py-3 text-sm leading-relaxed shadow-sm shadow-blue-200">${escapeHtml(text)}</div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

export function addBotMessage(text: string): void {
  removeWelcome();
  const msgs = getMessagesContainer();
  const div = document.createElement('div');
  div.className = 'flex flex-col items-start gap-1';
  div.innerHTML = `
    <span class="text-xs font-mono text-blue-300 pl-1">FinChat · ${now()}</span>
    <div class="bubble-bot max-w-xl bg-white border border-blue-100 text-slate-700 px-4 py-3 text-sm leading-relaxed shadow-sm">${text.replace(/\n/g, '<br>')}</div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

export function addThinkingIndicator(label: string): void {
  removeWelcome();
  removeThinkingIndicator(); // xóa cái cũ nếu có
  const msgs = getMessagesContainer();
  const div = document.createElement('div');
  div.id = 'thinking';
  div.className = 'flex items-center gap-2.5 bg-white border border-blue-100 rounded-2xl px-4 py-3 w-fit shadow-sm';
  div.innerHTML = `
    <div class="flex gap-1">
      <span class="dot-1 w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
      <span class="dot-2 w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
      <span class="dot-3 w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
    </div>
    <span class="text-xs font-mono text-blue-400">${label}</span>`;
  msgs.appendChild(div);
  scrollToBottom();
}

export function removeThinkingIndicator(): void {
  document.getElementById('thinking')?.remove();
}

export function addToolCard(results: CalcResult[]): void {
  const msgs = getMessagesContainer();
  let rows = '';
  results.forEach(({ equation, formatted }) => {
    rows += `
      <div class="flex items-center gap-2 py-1 border-b border-blue-50 last:border-0">
        <span class="text-xs font-mono text-blue-300">calc</span>
        <span class="text-xs font-mono text-amber-600 flex-1">${escapeHtml(equation)}</span>
        <span class="text-xs text-blue-200">→</span>
        <span class="text-xs font-mono font-medium text-emerald-600">${formatted}</span>
      </div>`;
  });

  const div = document.createElement('div');
  div.className = 'flex flex-col items-start';
  div.innerHTML = `
    <div class="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-sm w-fit min-w-64">
      <div class="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
        <span>⚡</span>
        <span class="text-xs font-mono font-medium text-blue-600">JS Calculator</span>
        <span class="text-xs text-emerald-500 ml-1">✓ ${results.length} phép tính</span>
        <span class="text-xs font-mono text-blue-300 ml-auto">${now()}</span>
      </div>
      <div class="px-3 py-2">${rows}</div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

export function addErrorMessage(msg: string): void {
  removeWelcome();
  const msgs = getMessagesContainer();
  const div = document.createElement('div');
  div.className = 'flex flex-col items-start';
  div.innerHTML = `
    <div class="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-xs font-mono max-w-sm">
      ⚠ ${escapeHtml(msg)}
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
}

// ───────────────────────────────────────────
// STATS
// ───────────────────────────────────────────

export function updateStats(calls: number, calcs: number, questions: number): void {
  const el = (id: string) => document.getElementById(id);
  const c = el('stat-calls');
  const ca = el('stat-calcs');
  const q = el('stat-questions');
  if (c) c.textContent = String(calls);
  if (ca) ca.textContent = String(calcs);
  if (q) q.textContent = String(questions);
}

// ───────────────────────────────────────────
// INPUT
// ───────────────────────────────────────────

export function autoResizeTextarea(el: HTMLTextAreaElement): void {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 112) + 'px';
}

export function setSendButtonState(enabled: boolean): void {
  const btn = document.getElementById('send-btn') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

// ───────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
