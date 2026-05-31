import { useEffect, useRef, useState } from "react";
import { api, type ChatMessage } from "../../api/client";
import { Spinner } from "../../components/Spinner";

// ── Suggested starter questions ───────────────────────────────────────────────

const SUGGESTIONS: string[] = [
  "Which platform has the cheapest products?",
  "Which product has the best rating?",
  "Which product has the biggest discount?",
  "Compare Amazon vs Jumia average ratings",
  "Which products have the most reviews?",
  "Are there any products with a price drop?",
  "Summarize customer opinions across all products",
  "Which product has the worst reviews?",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id:      string;
  role:    "user" | "model";
  content: string;
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Turns **bold**, *italic* and bullet lists into styled spans without a heavy dep.

function renderContent(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // bullet list
    if (/^[\-\*•]\s/.test(line)) {
      const body = line.replace(/^[\-\*•]\s/, "");
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-stone-400 shrink-0">•</span>
          <span>{inlineFormat(body)}</span>
        </div>
      );
    }
    // numbered list
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-stone-400 shrink-0 tabular-nums">{line.match(/^\d+/)![0]}.</span>
          <span>{inlineFormat(line.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    }
    // heading-like lines (bold-only lines)
    if (/^\*\*.+\*\*$/.test(line.trim())) {
      return (
        <p key={i} className="font-bold mt-2 mb-0.5">
          {line.trim().replace(/^\*\*|\*\*$/g, "")}
        </p>
      );
    }
    // empty line → spacer
    if (!line.trim()) return <div key={i} className="h-2" />;
    // normal line
    return <p key={i} className="my-0.5 leading-relaxed">{inlineFormat(line)}</p>;
  });
}

function inlineFormat(text: string) {
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center h-5">
      {[0, 150, 300].map(delay => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-stone-300 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
          isUser
            ? "bg-stone-800 text-white"
            : "bg-indigo-100 text-indigo-700 border border-indigo-200"
        }`}
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* Content */}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? "bg-stone-800 text-white rounded-tr-sm"
            : "bg-white border border-stone-100 text-stone-700 shadow-sm rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p className="leading-relaxed">{msg.content}</p>
        ) : (
          <div>{renderContent(msg.content)}</div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      // Build the turn list for the API (role + content only)
      const turns: ChatMessage[] = history.map(m => ({
        role:    m.role,
        content: m.content,
      }));

      const res = await api.chat(turns);

      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: "model", content: res.response },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id:      crypto.randomUUID(),
          role:    "model",
          content: "❌ Failed to reach the AI assistant. Please check your API key or try again.",
        },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>

      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">

        {/* Welcome / empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-stone-800 flex items-center justify-center text-3xl mb-4 shadow-lg">
              🤖
            </div>
            <h3 className="text-lg font-black text-stone-800 mb-1">AI Data Assistant</h3>
            <p className="text-sm text-stone-400 max-w-sm mb-8 leading-relaxed">
              Ask anything about your tracked products — prices, ratings, discounts,
              trends, or customer opinions. Powered by Gemini.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:border-stone-400 hover:text-stone-800 hover:shadow-sm transition-all text-left disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.map(msg => (
          <Bubble key={msg.id} msg={msg} />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[11px] font-bold text-indigo-700 shrink-0">
              AI
            </div>
            <div className="bg-white border border-stone-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Quick suggestions strip (after first message) ───────────────────── */}
      {!isEmpty && !loading && (
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 no-scrollbar">
          {SUGGESTIONS.slice(0, 4).map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:border-stone-400 transition-all whitespace-nowrap shrink-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border border-stone-200 rounded-2xl shadow-sm flex items-end gap-3 px-4 py-3 mt-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your products… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none leading-relaxed bg-transparent"
          style={{ minHeight: "24px", maxHeight: "128px" }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-stone-800 disabled:bg-stone-200 text-white disabled:text-stone-400 flex items-center justify-center transition-colors shrink-0 hover:bg-stone-700"
          title="Send message"
        >
          {loading ? (
            <Spinner size={4} />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Footer hint ─────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-stone-400 text-center mt-2 shrink-0">
        Powered by Google Gemini · answers are based on your scraped product data
      </p>
    </div>
  );
}
