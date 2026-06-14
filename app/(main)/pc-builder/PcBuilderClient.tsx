"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Cpu, CircuitBoard, MonitorPlay, MemoryStick,
  Zap, Server, HardDrive, Wrench, Check,
  Plus, X, Sparkles, ChevronRight, ChevronLeft, ChevronDown,
  Bot, History, Trash2, ShoppingCart, RotateCcw,
  Loader2, SendHorizonal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/store/useAuth";
import type { SubcategoryId } from "@/lib/products";
import type { ComponentProduct } from "./page";

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "pc_builder_history";

// ─── View state ───────────────────────────────────────────────────────────────

type View = "menu" | "manual" | "ai" | "history";

// ─── Slot definitions ─────────────────────────────────────────────────────────

type SlotId = SubcategoryId;

type Slot = {
  id:   SlotId;
  label: string;
  icon: React.ElementType;
};

const SLOTS: Slot[] = [
  { id: "cpu",        label: "Procesor (CPU)",      icon: Cpu          },
  { id: "placa_baza", label: "Placă de bază",       icon: CircuitBoard },
  { id: "gpu",        label: "Placă video (GPU)",   icon: MonitorPlay  },
  { id: "ram",        label: "Memorie RAM",          icon: MemoryStick  },
  { id: "sursa",      label: "Sursă de alimentare", icon: Zap          },
  { id: "carcasa",    label: "Carcasă",              icon: Server       },
  { id: "stocare",    label: "Stocare",              icon: HardDrive    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Build = Partial<Record<SlotId, ComponentProduct>>;

export type SavedBuild = {
  id:         string;
  savedAt:    string;
  totalPrice: number;
  components: Build;
};

type Props = { components: ComponentProduct[] };

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readHistory(): SavedBuild[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as SavedBuild[];
  } catch {
    return [];
  }
}

function writeHistory(history: SavedBuild[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(history));
}

function buildTotal(build: Build): number {
  return Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0);
}

// ─── AI Builder view ──────────────────────────────────────────────────────────

type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; build: Record<string, ComponentProduct>; explanation: string }
  | { status: "error"; message: string };

function AiBuilderView({
  components,
  onBack,
}: {
  components:  ComponentProduct[];
  onBack:      () => void;
}) {
  const [prompt,  setPrompt]  = useState("");
  const [aiState, setAiState] = useState<AiState>({ status: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addItem } = useCart();
  const { user }    = useAuth();

  const availableProducts = useMemo(
    () => components.map((c) => ({ id: c.id, name: c.name, price: c.price, subcategory: c.subcategory })),
    [components],
  );

  async function handleGenerate() {
    const q = prompt.trim();
    if (!q) return;
    setAiState({ status: "loading" });
    try {
      const res = await fetch("/api/ai/generate-build", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ prompt: q, availableProducts }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as {
        build:       Record<string, ComponentProduct>;
        explanation: string;
      };
      setAiState({ status: "done", build: data.build, explanation: data.explanation });
    } catch {
      setAiState({ status: "error", message: "Generarea configurației a eșuat. Încearcă din nou." });
    }
  }

  async function handleAddToCart() {
    if (aiState.status !== "done") return;
    const products = Object.values(aiState.build) as ComponentProduct[];
    let added = 0;
    for (const p of products) {
      const ok = await addItem({ id: p.id, name: p.name, price: p.price, imageUrl: p.image_url });
      if (ok) added++;
    }
    toast(added === products.length ? `${added} produse adăugate în coș!` : `${added} din ${products.length} adăugate.`);
  }

  const totalPrice = aiState.status === "done"
    ? Object.values(aiState.build).reduce((s, p) => s + (p?.price ?? 0), 0)
    : 0;

  return (
    <div className="mx-auto flex w-[90%] max-w-[800px] flex-1 flex-col px-4 py-8 sm:px-6">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex w-fit items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
      >
        <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
        Înapoi la meniu
      </button>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
          Creare calculator cu AI
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Descrie ce vrei să faci cu PC-ul tău și AI-ul alege componentele potrivite.
        </p>
      </div>

      {/* ── Prompt area (always visible) ── */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <label htmlFor="ai-prompt" className="mb-2 block text-sm font-semibold text-neutral-700">
          Descrie utilizarea dorită
        </label>
        <textarea
          ref={textareaRef}
          id="ai-prompt"
          rows={3}
          placeholder="Ex: Vreau un PC pentru gaming la 1080p cu un buget de 3000 lei, sau un calculator pentru birou și navigare web."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
          }}
          className="w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-shadow focus:border-[#22624a] focus:ring-2 focus:ring-[#22624a]/20"
        />
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || aiState.status === "loading"}
            className="flex items-center gap-2 rounded-xl bg-[#22624a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a4d3a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
          >
            <SendHorizonal className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Generează
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {aiState.status === "loading" && (
        <div className="mt-6 flex flex-col items-center gap-5 rounded-2xl border border-[#a8d7c5] bg-[#edf5f1] p-8 text-center">
          <Loader2 className="size-10 animate-spin text-[#22624a]" strokeWidth={1.75} aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[#22624a]">AI-ul generează configurația ideală…</p>
            <p className="mt-1 text-xs text-[#379b72]">Analizăm componentele disponibile și cerințele tale.</p>
          </div>
          {/* skeleton rows */}
          <div className="w-full space-y-3">
            {SLOTS.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[#d4ebe2] bg-white px-4 py-3">
                <div className="size-8 animate-pulse rounded-lg bg-[#d4ebe2]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-[#d4ebe2]" />
                  <div className="h-2 w-1/2 animate-pulse rounded-full bg-[#edf5f1]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {aiState.status === "error" && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-medium text-red-600">{aiState.message}</p>
        </div>
      )}

      {/* ── Result ── */}
      {aiState.status === "done" && (
        <div className="mt-6 flex flex-col gap-4">
          {/* explanation */}
          {aiState.explanation && (
            <div className="rounded-xl border border-[#a8d7c5] bg-[#edf5f1] px-5 py-4">
              <p className="text-sm leading-relaxed text-[#1a4d3a] text-justify">{aiState.explanation}</p>
            </div>
          )}

          {/* component list */}
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {SLOTS.map((slot, i) => {
              const p = aiState.build[slot.id] as ComponentProduct | undefined;
              const Icon = slot.icon;
              return (
                <div
                  key={slot.id}
                  className={`flex items-center gap-4 px-5 py-3.5 ${i < SLOTS.length - 1 ? "border-b border-neutral-100" : ""}`}
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${p ? "bg-[#22624a] text-white" : "bg-neutral-100 text-neutral-400"}`}
                  >
                    <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{slot.label}</p>
                    {p ? (
                      <p className="truncate text-sm font-semibold text-neutral-900">{p.name}</p>
                    ) : (
                      <p className="text-sm text-neutral-400 italic">Nedisponibil</p>
                    )}
                  </div>
                  {p && (
                    <span className="shrink-0 text-sm font-bold text-[#22624a]">{formatPrice(p.price)}</span>
                  )}
                </div>
              );
            })}

            {/* total */}
            <div className="flex items-center justify-between border-t-2 border-neutral-200 bg-neutral-50 px-5 py-4">
              <span className="text-sm font-bold text-neutral-700">Total estimat</span>
              <span className="text-xl font-extrabold text-[#22624a]">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          {/* action buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22624a] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
            >
              <ShoppingCart className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Adaugă în coș
            </button>
            <button
              type="button"
              onClick={() => {
                setAiState({ status: "idle" });
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#22624a] bg-white px-5 py-3 text-sm font-semibold text-[#22624a] transition-colors hover:bg-[#edf5f1] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
            >
              <RotateCcw className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Reface configurația
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Saved builds section (inline, used directly in MenuView) ────────────────

function SavedBuildsSection({
  onLoad,
}: {
  onLoad: (build: Build) => void;
}) {
  const [history, setHistory] = useState<SavedBuild[]>([]);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  function deleteSaved(id: string) {
    const next = history.filter((b) => b.id !== id);
    writeHistory(next);
    setHistory(next);
    toast("Configurație ștearsă.");
  }

  if (history.length === 0) return null;

  return (
    <div className="mx-auto mt-12 max-w-4xl">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
          <History className="size-4" strokeWidth={2} aria-hidden />
        </span>
        <h2 className="text-base font-bold text-neutral-800">Configurații salvate</h2>
        <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
          {history.length}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[...history].reverse().map((saved) => {
          const products = Object.values(saved.components).filter(Boolean) as ComponentProduct[];
          const date = new Date(saved.savedAt).toLocaleDateString("ro-RO", {
            day: "2-digit", month: "long", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          });
          return (
            <li key={saved.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onLoad(saved.components)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onLoad(saved.components);
                  }
                }}
                className="cursor-pointer rounded-2xl border-2 border-neutral-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-[#22624a] hover:shadow-md focus-visible:border-[#22624a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-neutral-400">{date}</p>
                    <p className="mt-0.5 text-lg font-bold text-neutral-900">{formatPrice(saved.totalPrice)}</p>
                    <p className="text-xs text-neutral-500">{products.length} din {SLOTS.length} componente</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSaved(saved.id);
                    }}
                    aria-label="Șterge configurația"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                </div>

                <div className="flex flex-col items-start gap-2">
                  {SLOTS.map((slot) => {
                    const p = saved.components[slot.id];
                    return p ? (
                      <span key={slot.id} className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700">
                        <slot.icon className="size-3 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
                        {p.name}
                      </span>
                    ) : (
                      <span key={slot.id} className="flex items-center gap-1.5 rounded-full border border-dashed border-neutral-200 px-2.5 py-1 text-xs text-neutral-300">
                        <slot.icon className="size-3 shrink-0" strokeWidth={1.75} aria-hidden />
                        {slot.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Inline product picker ────────────────────────────────────────────────────

function InlinePicker({
  slot,
  products,
  selectedId,
  onSelect,
  onClose,
}: {
  slot:       Slot;
  products:   ComponentProduct[];
  selectedId: string | undefined;
  onSelect:   (p: ComponentProduct) => void;
  onClose:    () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="border-t border-[#d4ebe2] bg-[#edf5f1]/40 px-4 pb-4 pt-3">
      {/* Search bar */}
      <div className="mb-3 flex items-center gap-2">
        <input
          type="search"
          autoFocus
          placeholder={`Caută ${slot.label.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-shadow focus:border-[#22624a] focus:ring-2 focus:ring-[#22624a]/20"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Închide"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">
          {search ? "Niciun rezultat." : "Nicio componentă disponibilă."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-0.5">
          {filtered.map((product) => {
            const active = product.id === selectedId;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => onSelect(product)}
                  className={`group flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors ${
                    active
                      ? "border-[#7bc3a8] bg-[#d4ebe2]"
                      : "border-neutral-200 bg-white hover:border-[#a8d7c5] hover:bg-neutral-50"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-100 bg-white p-1">
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image_url} alt={product.name} className="size-full object-contain" />
                    ) : (
                      <HardDrive className="size-5 text-neutral-300" strokeWidth={1.5} aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">{product.name}</p>
                    <p className="text-xs font-medium text-[#22624a]">{formatPrice(product.price)}</p>
                  </div>

                  {active ? (
                    <Check className="size-4 shrink-0 text-[#22624a]" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-neutral-300 group-hover:text-[#4faf8b]" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type CompatibilityState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; analysis: string }
  | { status: "error"; message: string };

export default function PcBuilderClient({ components }: Props) {
  const [view,         setView]         = useState<View>("menu");
  const [build,        setBuild]        = useState<Build>({});
  const [expandedSlot, setExpandedSlot] = useState<SlotId | null>(null);
  const [aiModal,      setAiModal]      = useState(false);
  const [aiState,      setAiState]      = useState<CompatibilityState>({ status: "idle" });

  const { addItem } = useCart();
  const { user }    = useAuth();

  // Pre-group products by subcategory so each slot picker doesn't re-filter all components
  const productsBySlot = useMemo<Record<SlotId, ComponentProduct[]>>(() => {
    const map = {} as Record<SlotId, ComponentProduct[]>;
    for (const slot of SLOTS) map[slot.id] = [];
    for (const c of components) {
      if (c.subcategory in map) map[c.subcategory].push(c);
    }
    return map;
  }, [components]);

  const totalPrice  = useMemo(() => buildTotal(build), [build]);
  const filledCount = SLOTS.filter((s) => build[s.id]).length;
  const isComplete  = filledCount === SLOTS.length;

  function toggleExpand(slotId: SlotId) {
    setExpandedSlot((prev) => (prev === slotId ? null : slotId));
  }

  function selectProduct(slotId: SlotId, product: ComponentProduct) {
    setBuild((prev) => ({ ...prev, [slotId]: product }));
    setExpandedSlot(null);
  }

  function clearSlot(slotId: SlotId) {
    setBuild((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setExpandedSlot(null);
  }

  async function handleCheckCompatibility() {
    const selectedComponents = SLOTS
      .filter((s) => build[s.id])
      .map((s) => {
        const p = build[s.id]!;
        return { id: p.id, name: p.name, price: p.price, subcategory: s.id };
      });

    // Pass the full store inventory so Gemini can suggest replacements from real products
    const availableProducts = components.map((c) => ({
      id:          c.id,
      name:        c.name,
      price:       c.price,
      subcategory: c.subcategory,
    }));

    setAiModal(true);
    setAiState({ status: "loading" });

    try {
      const res = await fetch("/api/ai/check-compatibility", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ selectedComponents, availableProducts }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = (await res.json()) as { analysis: string };
      setAiState({ status: "done", analysis: data.analysis });
    } catch {
      setAiState({ status: "error", message: "Analiza a eșuat. Încearcă din nou." });
    }
  }

  const handleSaveBuild = useCallback(() => {
    const saved: SavedBuild = {
      id:         crypto.randomUUID(),
      savedAt:    new Date().toISOString(),
      totalPrice: buildTotal(build),
      components: build,
    };
    writeHistory([...readHistory(), saved]);
    toast("Configurația a fost salvată în istoric!");
  }, [build]);

  // Cart only — no history save
  const handleAddToCart = useCallback(async () => {
    const products = Object.values(build).filter(Boolean) as ComponentProduct[];
    let added = 0;
    for (const p of products) {
      const ok = await addItem({ id: p.id, name: p.name, price: p.price, imageUrl: p.image_url });
      if (ok) added++;
    }
    if (added === products.length) {
      toast(`${added} produse adăugate în coș!`);
    } else {
      toast(`${added} din ${products.length} produse adăugate. Unele au eșuat.`);
    }
  }, [build, user, addItem]);

  function loadBuild(savedBuild: Build) {
    setBuild(savedBuild);
    setExpandedSlot(null);
    setView("manual");
  }

  // ── Routing ─────────────────────────────────────────────────────────────────

  if (view === "ai") {
    return (
      <AiBuilderView
        components={components}
        onBack={() => setView("menu")}
      />
    );
  }

  if (view === "menu") {
    return <MenuView onSelect={setView} onLoad={loadBuild} />;
  }

  // view === "manual"
  return (
    <div className="mx-auto w-[90%] max-w-[1100px] flex-1 px-4 py-8 sm:px-6">

      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Configurare manuală
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Alege componentele și verifică compatibilitatea cu AI
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-700">
              {filledCount} din {SLOTS.length} componente selectate
            </span>
            {filledCount > 0 && (
              <span className="font-semibold text-[#22624a]">{formatPrice(totalPrice)}</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-[#22624a] transition-all duration-500"
              style={{ width: `${(filledCount / SLOTS.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={filledCount}
              aria-valuemin={0}
              aria-valuemax={SLOTS.length}
            />
          </div>
        </div>
      </div>

      {/* ── Slot list ── */}
      <div className="flex flex-col gap-3">
        {SLOTS.map((slot) => {
          const selected   = build[slot.id];
          const isExpanded = expandedSlot === slot.id;
          const Icon       = slot.icon;

          return (
            <div
              key={slot.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
                isExpanded
                  ? "border-[#7bc3a8]"
                  : selected
                  ? "border-[#a8d7c5] bg-[#edf5f1]/30"
                  : "border-neutral-200"
              }`}
            >
              {/* ── Slot row ── */}
              <div className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    selected || isExpanded ? "bg-[#22624a] text-white" : "bg-neutral-100 text-neutral-400"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  {selected ? (
                    <>
                      <p className="text-xs font-semibold text-neutral-400">{slot.label}</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-neutral-900">
                        {selected.name}
                      </p>
                      <p className="text-xs font-medium text-[#22624a]">{formatPrice(selected.price)}</p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-neutral-600">
                      {slot.label}
                      <span className="ml-1 text-red-400">*</span>
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {selected ? (
                    <>
                      <span className="hidden rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 sm:inline">
                        <Check className="mr-1 inline size-3" strokeWidth={2.5} />
                        Selectat
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleExpand(slot.id)}
                        className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-[#22624a]"
                      >
                        Schimbă
                        <ChevronDown
                          className={`size-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => clearSlot(slot.id)}
                        aria-label={`Elimină ${slot.label}`}
                        className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="size-4" strokeWidth={2} aria-hidden />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleExpand(slot.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#22624a] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-1"
                    >
                      <Plus className="size-3.5" strokeWidth={2.5} />
                      Selectează
                    </button>
                  )}
                </div>
              </div>

              {/* ── Inline picker (expanded) ── */}
              {isExpanded && (
                <InlinePicker
                  slot={slot}
                  products={productsBySlot[slot.id]}
                  selectedId={selected?.id}
                  onSelect={(p) => selectProduct(slot.id, p)}
                  onClose={() => setExpandedSlot(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          {isComplete
            ? "Poți verifica compatibilitatea sau îl poți salva."
            : `Mai ai ${SLOTS.length - filledCount} slot${SLOTS.length - filledCount !== 1 ? "uri" : ""} de completat.`}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("menu")}
            className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            Inapoi
          </button>

          <button
            type="button"
            onClick={() => setBuild({})}
            disabled={filledCount === 0}
            className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Resetează
          </button>

          <span className="flex-1" aria-hidden />

          <button
            type="button"
            onClick={handleCheckCompatibility}
            disabled={filledCount === 0}
            className="flex items-center gap-2 rounded-lg border border-[#a8d7c5] bg-[#edf5f1] px-4 py-2.5 text-sm font-semibold text-[#1a4d3a] transition-colors hover:bg-[#d4ebe2] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Verifică compatibilitate (AI)
          </button>


          <button
            type="button"
            onClick={handleSaveBuild}
            disabled={filledCount === 0}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Salvează
          </button>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={filledCount === 0}
            className="rounded-lg bg-[#22624a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Adaugă în coș
          </button>
        </div>
      </div>

      {/* ── AI Compatibility Modal ── */}
      <Dialog open={aiModal} onOpenChange={(open) => { if (!open) setAiModal(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#22624a] text-white">
                <Sparkles className="size-4" strokeWidth={2} aria-hidden />
              </span>
              Verificare compatibilitate AI
            </DialogTitle>
          </DialogHeader>

          {/* Loading */}
          {aiState.status === "loading" && (
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <Loader2 className="size-10 animate-spin text-[#22624a]" strokeWidth={1.75} aria-hidden />
              <p className="text-sm font-medium text-neutral-600">
                AI analizează build-ul tău…
              </p>
              <p className="text-xs text-neutral-400">Acest proces durează câteva secunde.</p>
            </div>
          )}

          {/* Error */}
          {aiState.status === "error" && (
            <div className="px-6 py-6 text-center">
              <p className="text-sm font-medium text-red-600">{aiState.message}</p>
            </div>
          )}

          {/* Result */}
          {aiState.status === "done" && (
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              <div className="prose prose-sm prose-neutral max-w-none">
                {aiState.analysis.split("\n").map((line, i) => {
                  if (!line.trim()) return <div key={i} className="h-2" />;
                  // Bold **text**
                  const rendered = line.replace(
                    /\*\*(.+?)\*\*/g,
                    (_, m) => `<strong>${m}</strong>`,
                  );
                  return (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-justify text-neutral-700"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: rendered }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {aiState.status !== "loading" && (
            <DialogFooter>
              <button
                type="button"
                onClick={() => setAiModal(false)}
                className="rounded-lg border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Închide
              </button>
              {aiState.status === "error" && (
                <button
                  type="button"
                  onClick={handleCheckCompatibility}
                  className="flex items-center gap-2 rounded-lg bg-[#22624a] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a4d3a]"
                >
                  <Sparkles className="size-4" strokeWidth={2} aria-hidden />
                  Încearcă din nou
                </button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Menu view ────────────────────────────────────────────────────────────────

type MenuCard = {
  id:       View;
  icon:     React.ElementType;
  label:    string;
  subtitle: string;
};

const ACTION_CARDS: MenuCard[] = [
  {
    id:       "manual",
    icon:     Wrench,
    label:    "Creare calculator",
    subtitle: "Selectează manual fiecare componentă și construiește configurația ideală.",
  },
  {
    id:       "ai",
    icon:     Bot,
    label:    "Creare calculator cu AI",
    subtitle: "Descrie ce vrei să faci cu PC-ul tău și AI-ul alege componentele potrivite.",
  },
];

function MenuCard({ card, onSelect }: { card: MenuCard; onSelect: (v: View) => void }) {
  const { id, icon: Icon, label, subtitle } = card;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="group relative flex flex-col items-start gap-4 rounded-2xl bg-[#22624a] p-6 text-left shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-white/20">
        <Icon className="size-6 text-white" strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold leading-snug text-white">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-[#d4ebe2]">{subtitle}</p>
      </div>
      <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-white">
        Începe
        <ChevronRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2.5} aria-hidden />
      </span>
    </button>
  );
}

function MenuView({
  onSelect,
  onLoad,
}: {
  onSelect: (v: View) => void;
  onLoad:   (build: Build) => void;
}) {
  return (
    <div className="mx-auto w-[90%] max-w-[1100px] flex-1 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
          Configurează-ți propriul calculator
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Alege una dintre cele 2 opțiuni
        </p>
      </div>

      {/* Two main action cards — centred 2-column grid */}
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
        {ACTION_CARDS.map((card) => (
          <MenuCard key={card.id} card={card} onSelect={onSelect} />
        ))}
      </div>

      {/* Saved configurations list — rendered inline below the action cards */}
      <SavedBuildsSection onLoad={onLoad} />
    </div>
  );
}
