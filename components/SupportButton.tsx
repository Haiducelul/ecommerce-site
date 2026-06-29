"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  useCloseOnDesktop,
  useCloseOnRouteChange,
} from "@/hooks/use-overlay-guards";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { MessageCircle, Send, X, Loader2, RotateCcw } from "lucide-react";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

const INITIAL_CHIPS = ["Cât durează livrarea?", "Care este politica de retur?", "Contact operator."];
const FOLLOWUP_CHIPS = ["Am o altă întrebare.", "Vreau să fiu contactat.", "Asta este tot, mulțumesc!"];
const DELAY_NOTICE_MS = 4000;

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  contactLink?: boolean;
};
type ChipStage = "initial" | "followup" | "done";

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [chipStage, setChipStage] = useState<ChipStage>("initial");
  const [isDelayed, setIsDelayed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setOpen(false), []);

  useCloseOnRouteChange(closeChat);
  useCloseOnDesktop(open, closeChat);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: (input, init) =>
          fetchWithRetry(input, init, {
            maxRetries: 3,
            retryDelayMs: 2000,
            onRetry: () => setIsDelayed(true),
          }),
      }),
    [],
  );

  const { messages, sendMessage, setMessages, status, error, clearError } = useChat({
    transport: chatTransport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const hasAnyMessage = localMessages.length > 0 || messages.length > 0;

  const resetChat = useCallback(() => {
    setLocalMessages([]);
    setMessages([]);
    setInput("");
    setIsDelayed(false);
    clearError();
    setChipStage("initial");
  }, [clearError, setMessages]);

  useEffect(() => {
    if (!isBusy) {
      setIsDelayed(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsDelayed(true);
    }, DELAY_NOTICE_MS);

    return () => clearTimeout(timer);
  }, [isBusy]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, localMessages, status]);

  // After AI finishes streaming, advance to followup chips
  useEffect(() => {
    if (status === "ready" && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant" && chipStage === "initial") {
        setChipStage("followup");
      }
    }
  }, [status, messages, chipStage]);

  const handleSend = useCallback((text: string) => {
    if (text === "A o altă întrebare") {
      setChipStage("initial");
      return;
    }

    const isDelivery = text === "Cât durează livrarea?";
    const isReturnPolicy =  text === "Care este politica de retur?";
    const isContact = text === "Contact operator." || text === "Vreau să fiu contactat";
    const isClosing = text === "Asta este tot, mulțumesc!";

    if (isDelivery || isReturnPolicy || isContact || isClosing) {
      let assistantText = "";
      let contactLink = false;

      if (isDelivery) {
        assistantText =
          "Livrarea standard durează între 1-2 zile lucrătoare, în funcție de localitate și disponibilitatea produselor.";
      } else if (isReturnPolicy) {
        assistantText =
          "Ai la dispoziție 14 zile calendaristice pentru a returna produsele. Pentru a iniția un retur, te rugăm să ne trimiți un email la contact@buildtech.ro cu detaliile comenzii.";
      } else if (isContact) {
        assistantText = "Pentru a discuta cu un coleg, te rugăm să accesezi pagina noastră de contact.";
        contactLink = true;
      } else if (isClosing) {
        assistantText = "Cu drag! O zi excelentă!";
      }

      setLocalMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text },
        { id: `a-${Date.now() + 1}`, role: "assistant", text: assistantText, contactLink },
      ]);

      if (isClosing) {
        setChipStage("done");
        setTimeout(() => setOpen(false), 2000);
      } else {
        setChipStage("followup");
      }
      return;
    }

    clearError();
    sendMessage({ text });
    // chips will advance to followup once AI responds (via useEffect above)
  }, [clearError, resetChat, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    handleSend(text);
    setInput("");
    // typed messages always advance to followup after response
    if (chipStage === "initial") setChipStage("followup");
  };

  const currentChips =
    chipStage === "initial"
      ? INITIAL_CHIPS
      : chipStage === "followup"
      ? FOLLOWUP_CHIPS
      : [];

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden flex-col items-end md:flex">
      {open && (
        <div
          role="dialog"
          aria-label="Chat suport Volt"
          className="mb-3 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[24rem]"
          style={{ height: "min(32rem, calc(100vh - 8rem))" }}
        >
          <header className="flex items-center justify-between border-b border-slate-100 bg-[#22624a] px-4 py-3 text-white">
            <p className="text-sm font-semibold">Suport Volt</p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={resetChat}
                disabled={isBusy}
                className="rounded-lg p-1.5 text-[#d4ebe2]/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Resetează chatul"
                title="Resetează chatul"
              >
                <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#d4ebe2] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Închide chatul"
              >
                <X className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </header>

          {/* Messages area */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {/* Greeting + initial chips */}
            {!hasAnyMessage && (
              <div className="space-y-3">
                <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-600">
                  Bună!
                  <br />
                  Sunt asistentul Volt.
                  <br />
                  Cu ce te pot ajuta astăzi?
                </p>
                <div className="flex flex-col gap-2">
                  {INITIAL_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSend(chip)}
                      disabled={isBusy}
                      className="rounded-xl border border-[#22624a]/30 bg-[#22624a]/5 px-3 py-2 text-left text-sm text-[#22624a] transition-colors hover:bg-[#22624a]/10 disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Local (predefined) messages */}
            {localMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#22624a] text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.text}
                  {msg.role === "assistant" && msg.contactLink && (
                    <div className="mt-2">
                      <Link
                        href="/contact"
                        className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#22624a] underline underline-offset-2 transition-colors hover:bg-[#edf5f1]"
                      >
                        Accesează pagina de contact
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* AI messages */}
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
                <div className="rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se scrie…
                  </div>
                  {isDelayed && (
                    <p className="mt-1 text-xs text-neutral-500">
                      Serverele sunt aglomerate. Durează puțin mai mult, te rugăm să aștepți...
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
                {error.message || "A apărut o eroare. Încearcă din nou."}
              </p>
            )}

            {/* Follow-up chips — shown after an answer is given */}
            {currentChips.length > 0 && hasAnyMessage && !isBusy && (
              <div className="flex flex-col gap-2 pt-1">
                {currentChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSend(chip)}
                    disabled={isBusy}
                    className="rounded-xl border border-[#22624a]/30 bg-[#22624a]/5 px-3 py-2 text-left text-sm text-[#22624a] transition-colors hover:bg-[#22624a]/10 disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
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
            <MessageCircle className="size-7" strokeWidth={1.75} aria-hidden />
          )}
        </span>
      </button>
    </div>
  );
}
