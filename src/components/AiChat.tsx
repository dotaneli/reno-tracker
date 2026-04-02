"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { MessageSquare, Send, X, ArrowLeft, Paperclip, Maximize2, Minimize2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/hooks/useProject";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ChatWidget } from "./ChatWidgets";

/* ─── Types ────────────────────────────────────────────────── */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/* ─── Page-aware suggestions ───────────────────────────────── */

const suggestionsEn: Record<string, string[]> = {
  "/": [
    "Summarize my project status",
    "What's overdue?",
    "How much have I spent?",
  ],
  "/tasks": [
    "What tasks are pending?",
    "Add a new task",
    "Show completed tasks",
  ],
  "/costs": [
    "Where am I over budget?",
    "Show unpaid payments",
    "Payment summary",
  ],
  "/issues": ["Show open issues", "Log a new problem"],
  "/vendors": ["List my vendors", "Which vendor costs the most?"],
};

const suggestionsHe: Record<string, string[]> = {
  "/": [
    "תן סיכום סטטוס הפרויקט",
    "מה באיחור?",
    "כמה הוצאתי?",
  ],
  "/tasks": [
    "אילו משימות ממתינות?",
    "הוסף משימה חדשה",
    "הצג משימות שהושלמו",
  ],
  "/costs": [
    "איפה אני חורג מהתקציב?",
    "הצג תשלומים שלא שולמו",
    "סיכום תשלומים",
  ],
  "/issues": ["הצג תקלות פתוחות", "דווח על בעיה חדשה"],
  "/vendors": ["רשימת הספקים שלי", "איזה ספק עולה הכי הרבה?"],
};

/* ─── CSS keyframes (injected once) ────────────────────────── */

const STYLE_ID = "ai-chat-keyframes";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ai-chat-pulse {
      0%, 100% { box-shadow: 0 0 0 0 var(--accent); }
      50% { box-shadow: 0 0 0 10px transparent; }
    }
    .ai-chat-pulse {
      animation: ai-chat-pulse 1.5s ease-in-out 3;
    }
    @keyframes ai-chat-dot {
      0%, 80%, 100% { opacity: 0.3; }
      40% { opacity: 1; }
    }
    .ai-chat-dot-1 { animation: ai-chat-dot 1.4s infinite; }
    .ai-chat-dot-2 { animation: ai-chat-dot 1.4s infinite 0.2s; }
    .ai-chat-dot-3 { animation: ai-chat-dot 1.4s infinite 0.4s; }
    /* Chat panel: full-screen on mobile, anchored card on desktop */
    .ai-chat-panel {
      position: fixed;
      inset: 0;
      z-index: 50;
    }
    @media (min-width: 768px) {
      .ai-chat-panel {
        inset: auto;
        bottom: 1.5rem;
        width: 400px;
        height: 500px;
        border-radius: 1rem;
      }
      .ai-chat-panel[data-anchor="right"] { right: 1.5rem; }
      .ai-chat-panel[data-anchor="left"] { left: 1.5rem; }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Component ────────────────────────────────────────────── */

export function AiChat() {
  const { t, lang, dir } = useI18n();
  const { activeProject } = useProject();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; type: string; base64: string } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRtl = dir === "rtl";
  const suggestions = lang === "he" ? suggestionsHe : suggestionsEn;

  // Inject keyframe styles
  useEffect(ensureStyles, []);

  // Persist open/closed state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("reno-chat-open");
    if (stored === "true") setOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("reno-chat-open", String(open));
  }, [open]);

  // Load chat history on first open
  useEffect(() => {
    if (!open || historyLoaded || !activeProject?.id) return;
    setHistoryLoaded(true);

    fetch(`/api/chat/history?projectId=${activeProject.id}`)
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data: ChatMessage[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
        }
      })
      .catch(() => {
        // Silently fail — history is optional
      });
  }, [open, historyLoaded, activeProject?.id]);

  // Reset history loaded flag when project changes
  useEffect(() => {
    setHistoryLoaded(false);
    setMessages([]);
  }, [activeProject?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  /* ─── Send message ───────────────────────────────────────── */

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming || !activeProject?.id) return;

      const userMsg: ChatMessage = {
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setPendingFile(null);
      setStreaming(true);
      setStreamingText("");
      setError(false);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            projectId: activeProject.id,
            context: { page: pathname },
            ...(pendingFile && { file: pendingFile }),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content =
                  parsed.choices?.[0]?.delta?.content ??
                  parsed.delta?.text ??
                  parsed.text ??
                  parsed.content ??
                  "";
                if (content) {
                  accumulated += content;
                  setStreamingText(accumulated);
                }
              } catch {
                // Plain text chunk (non-JSON SSE)
                if (data.trim()) {
                  accumulated += data;
                  setStreamingText(accumulated);
                }
              }
            }
          }
        }

        // Finalize assistant message
        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: accumulated || "(No response)",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User navigated away or cancelled — do nothing
          return;
        }
        setError(true);
      } finally {
        setStreaming(false);
        setStreamingText("");
        abortRef.current = null;
      }
    },
    [streaming, activeProject?.id, pathname, pendingFile],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  /* ─── Helpers ────────────────────────────────────────────── */

  const pageSuggestions =
    suggestions[pathname] ?? suggestions["/"] ?? [];

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <>
      {/* ── Floating bubble ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="ai-chat-pulse fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{
            bottom: "1.5rem",
            [isRtl ? "left" : "right"]: "1.5rem",
          }}
          aria-label={t("chat.title")}
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          className={`flex flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg-elevated)] shadow-2xl ${fullscreen ? "fixed inset-0 z-50 rounded-none" : "ai-chat-panel"}`}
          data-anchor={isRtl ? "left" : "right"}
          dir={dir}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--accent)] px-4 py-3">
            {/* Mobile: back arrow. Desktop: close X */}
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-white"
              aria-label="Close"
            >
              <span className="md:hidden">
                <ArrowLeft size={20} />
              </span>
              <span className="hidden md:inline">
                <X size={20} />
              </span>
            </button>
            <h2 className="text-sm font-semibold text-white">
              {t("chat.title")}
            </h2>
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="hidden md:flex items-center justify-center text-white/70 hover:text-white"
              aria-label="Toggle fullscreen"
            >
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>

          {/* ── Messages area ── */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Suggested prompts when empty */}
            {messages.length === 0 && !streaming && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
                  <MessageSquare
                    size={24}
                    className="text-[var(--accent)]"
                  />
                </div>
                <p className="text-sm text-[var(--fg-muted)]">
                  {t("chat.suggestions")}
                </p>
                <div className="flex flex-col gap-2">
                  {pageSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-start text-sm text-[var(--fg)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 flex flex-col ${
                  msg.role === "user"
                    ? isRtl
                      ? "items-start"
                      : "items-end"
                    : isRtl
                      ? "items-end"
                      : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--fg)]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_table]:text-xs [&_code]:bg-[var(--border-subtle)] [&_code]:px-1 [&_code]:rounded [&_pre]:bg-[var(--bg)] [&_pre]:p-2 [&_pre]:rounded-lg [&_strong]:text-[var(--fg)]">
                      <ReactMarkdown components={{
                        code({ className, children }) {
                          const lang = className?.replace("language-", "") || "";
                          const text = String(children).trim();
                          if (lang === "widget") return <ChatWidget json={text} />;
                          return <code className={className}>{children}</code>;
                        },
                        pre({ children }) { return <>{children}</>; },
                      }}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
                <span className="mt-1 text-[10px] text-[var(--fg-muted)]">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            ))}

            {/* Streaming response */}
            {streaming && (
              <div
                className={`mb-3 flex flex-col ${
                  isRtl ? "items-end" : "items-start"
                }`}
              >
                <div className="max-w-[85%] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--fg)]">
                  {streamingText ? (
                    <div className="prose prose-sm max-w-none break-words [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_table]:text-xs [&_code]:bg-[var(--border-subtle)] [&_code]:px-1 [&_code]:rounded [&_strong]:text-[var(--fg)]">
                      <ReactMarkdown components={{
                        code({ className, children }) {
                          const lang = className?.replace("language-", "") || "";
                          const text = String(children).trim();
                          if (lang === "widget") return <ChatWidget json={text} />;
                          return <code className={className}>{children}</code>;
                        },
                        pre({ children }) { return <>{children}</>; },
                      }}>{streamingText}</ReactMarkdown>
                    </div>
                  ) : (
                    /* Typing indicator dots */
                    <div className="flex items-center gap-1 py-1">
                      <span className="ai-chat-dot-1 h-2 w-2 rounded-full bg-[var(--fg-muted)]" />
                      <span className="ai-chat-dot-2 h-2 w-2 rounded-full bg-[var(--fg-muted)]" />
                      <span className="ai-chat-dot-3 h-2 w-2 rounded-full bg-[var(--fg-muted)]" />
                    </div>
                  )}
                </div>
                <span className="mt-1 text-[10px] text-[var(--fg-muted)]">
                  {t("chat.thinking")}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-3 rounded-lg bg-[var(--alert)]/10 px-3 py-2 text-center text-sm text-[var(--alert)]">
                {t("chat.error")}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-3"
          >
            {/* Pending file indicator */}
            {pendingFile && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-[var(--accent)]/10 px-3 py-1.5 text-xs text-[var(--accent)]">
                <Paperclip size={12} />
                <span className="flex-1 truncate">{pendingFile.name}</span>
                <button type="button" onClick={() => setPendingFile(null)} className="text-[var(--fg-muted)] hover:text-[var(--alert)]">
                  <X size={12} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) { alert("Max 10MB"); return; }
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(",")[1];
                  setPendingFile({ name: file.name, type: file.type, base64 });
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--fg-muted)] transition-colors hover:bg-[var(--border-subtle)] hover:text-[var(--fg)] disabled:opacity-40"
              title={t("item.uploadReceipt")}
            >
              <Paperclip size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder")}
              disabled={streaming}
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-muted)] focus:border-[var(--accent)] disabled:opacity-50"
              style={{ direction: dir }}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label={t("chat.send")}
            >
              <Send size={16} className={isRtl ? "rotate-180" : ""} />
            </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
