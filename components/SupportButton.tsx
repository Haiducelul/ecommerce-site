"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useCloseOnDesktop,
  useCloseOnRouteChange,
} from "@/hooks/use-overlay-guards";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LifeBuoy, Send, X, Loader2 } from "lucide-react";

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setOpen(false), []);

  useCloseOnRouteChange(closeChat);
  useCloseOnDesktop(open, closeChat);

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;

    clearError();
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end">
      {open && (
        <div
          role="dialog"
          aria-label="Chat suport TECHPOINT"
          className="mb-3 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[24rem]"
          style={{ height: "min(32rem, calc(100vh - 8rem))" }}
        >
          <header className="flex items-center justify-between border-b border-slate-100 bg-[#22624a] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <LifeBuoy className="size-5" strokeWidth={2} aria-hidden />
              <div>
                <p className="text-sm font-semibold">Suport TECHPOINT</p>
                <p className="text-xs text-[#d4ebe2]">Asistent AI · răspuns în română</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-[#d4ebe2] transition-colors hover:bg-[#edf5f1]0 hover:text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Închide chatul"
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Bună! Sunt asistentul TECHPOINT. Cu ce te pot ajuta astăzi?
              </p>
            )}

            {messages.map((message) => {
              const text = getMessageText(message);
              if (!text) return null;

              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#22624a] text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {isBusy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Se scrie…
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
                {error.message || "A apărut o eroare. Încearcă din nou."}
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex gap-2 border-t border-slate-100 bg-slate-50 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy}
              placeholder="Scrie mesajul tău…"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] disabled:opacity-60"
              aria-label="Mesaj pentru suport"
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#22624a] text-white transition-colors hover:bg-[#1a4d3a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
              aria-label="Trimite mesaj"
            >
              <Send className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[#4faf8b] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50"
        aria-label={open ? "Închide suport clienți" : "Deschide chat suport clienți"}
        aria-expanded={open}
      >
        <span className="pointer-events-none absolute right-full top-1/2 mr-3 max-w-[11rem] -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-[opacity,transform] duration-200 ease-out group-hover:opacity-100 sm:text-sm">
          Suport Clienți
        </span>
        <span
          className={`flex size-14 items-center justify-center rounded-full bg-[#22624a] text-white shadow-lg transition-transform duration-200 ease-out group-hover:scale-105 group-active:scale-95 ${open ? "ring-2 ring-[#7bc3a8] ring-offset-2" : ""}`}
        >
          {open ? (
            <X className="size-7" strokeWidth={1.75} aria-hidden />
          ) : (
            <LifeBuoy className="size-7" strokeWidth={1.75} aria-hidden />
          )}
        </span>
      </button>
    </div>
  );
}
