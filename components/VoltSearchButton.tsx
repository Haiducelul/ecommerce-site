"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp, Loader2, MessageSquarePlus, X } from "lucide-react";
import { useCloseOnRouteChange } from "@/hooks/use-overlay-guards";
import { formatPrice } from "@/lib/products";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

const PROMPT_STARTERS = [
  "Recomandă-mi un laptop pentru programare, buget 5000 RON",
  "Care este cel mai bun telefon pentru poze?",
  "Calculator de gaming foarte bun, buget modest?",
] as const;

type ChatProduct = {
  id:        string;
  name:      string;
  price:     number;
  image_url: string | null;
};

type ChatMessage = {
  role:      "user" | "assistant";
  text:      string;
  products?: ChatProduct[];
};

type AiSearchResponse = {
  recommendedIds?: string[];
  explanation?:    string;
  error?:          string;
};

const DELAY_NOTICE_MS = 4000;

export default function VoltSearchButton() {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDelayed, setIsDelayed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const closeAi = useCallback(() => setAiOpen(false), []);

  useCloseOnRouteChange(closeAi);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchProducts = async (ids: string[]): Promise<ChatProduct[]> => {
    if (ids.length === 0) return [];

    const res = await fetch(`/api/products?ids=${ids.join(",")}`);
    const data = await res.json() as { products?: ChatProduct[] };
    if (!res.ok || !data.products) return [];

    const byId = new Map(data.products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter((p): p is ChatProduct => p != null);
  };

  const sendQuery = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setAiQuery("");
    setIsLoading(true);
    setIsDelayed(false);

    const delayTimer = setTimeout(() => {
      setIsDelayed(true);
    }, DELAY_NOTICE_MS);

    try {
      const res = await fetchWithRetry(
        "/api/search/ai",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ query: trimmed }),
        },
        {
          maxRetries: 3,
          retryDelayMs: 2000,
          onRetry: () => setIsDelayed(true),
        },
      );

      const data = await res.json() as AiSearchResponse;

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.error ?? "Căutarea AI a eșuat." },
        ]);
        return;
      }

      const products = await fetchProducts(data.recommendedIds ?? []);

      setMessages((prev) => [
        ...prev,
        {
          role:     "assistant",
          text:     data.explanation ?? "Iată recomandările mele:",
          products: products.length > 0 ? products : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Nu s-a putut contacta serviciul de căutare AI. Încearcă din nou.",
        },
      ]);
    } finally {
      clearTimeout(delayTimer);
      setIsDelayed(false);
      setIsLoading(false);
    }
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuery(aiQuery);
  };

  const handleStarterClick = (text: string) => {
    sendQuery(text);
  };

  const handleNewChat = () => {
    setMessages([]);
    setAiQuery("");
    setIsLoading(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setAiOpen(true)}
        aria-expanded={aiOpen}
        aria-haspopup="dialog"
        aria-label="Căutare cu Volt"
        className="flex shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
      >
        <Image
          src="/volt_logo.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 object-contain"
          aria-hidden
        />
      </button>

      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-md [&>button.absolute]:hidden"
        >
          <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-white px-4 pb-[10px] pt-[14px] shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <Image
                src="/volt_logo.png"
                alt="Volt"
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 object-contain"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="border-neutral-200 bg-white text-neutral-700 shadow-sm hover:bg-neutral-50"
                >
                  <MessageSquarePlus className="size-3.5" strokeWidth={2} aria-hidden />
                  Chat nou
                </Button>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Închide"
                    className="border-neutral-200 bg-white px-2 text-neutral-700 shadow-sm hover:bg-neutral-50"
                  >
                    <X className="size-4" strokeWidth={2} aria-hidden />
                  </Button>
                </SheetClose>
              </div>
            </div>
            <SheetTitle className="sr-only">Volt</SheetTitle>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {!hasMessages ? (
                <div className="flex flex-col items-center px-2 pt-6">
                  <h2 className="text-center text-2xl font-bold tracking-tight text-neutral-900">
                    Cu ce te pot ajuta astăzi?
                  </h2>

                  <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                    {PROMPT_STARTERS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleStarterClick(prompt)}
                        disabled={isLoading}
                        className="cursor-pointer rounded-full border border-border px-4 py-3 text-center text-sm text-primary transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "bg-[#22624a] text-white"
                            : "border border-neutral-200 bg-neutral-50 text-neutral-800"
                        }`}
                      >
                        <p>{message.text}</p>

                        {message.role === "assistant" && message.products && message.products.length > 0 && (
                          <div className="mt-3 flex w-full flex-col gap-3">
                            {message.products.map((product) => (
                              <Link
                                key={product.id}
                                href={`/product/${product.id}`}
                                className="flex w-full flex-row items-center gap-3 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 transition-colors hover:border-[#a8d7c5] hover:bg-[#edf5f1]/40"
                              >
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-white">
                                  {product.image_url ? (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className="h-20 w-20 object-contain"
                                    />
                                  ) : (
                                    <span className="text-xs text-neutral-400">Fără imagine</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="line-clamp-2 text-sm font-medium text-neutral-900">
                                    {product.name}
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#22624a]">
                                    {formatPrice(product.price)}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          Volt scrie…
                        </div>
                        {isDelayed && (
                          <p className="mt-1 text-xs text-neutral-400">
                            Serverele sunt aglomerate. Durează puțin mai mult, te rugăm să aștepți...
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-white px-4 pb-4 pt-3 shadow-sm">
              <form
                onSubmit={handleAiSubmit}
                className="flex items-center rounded-3xl border border-border bg-white p-2 shadow-sm"
              >
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Caută produse sau inspirație..."
                  aria-label="Caută produse sau inspirație"
                  disabled={isLoading}
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!aiQuery.trim() || isLoading}
                  aria-label="Trimite mesajul"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#22624a] text-white transition-colors hover:bg-[#1a4d3a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
                </button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
