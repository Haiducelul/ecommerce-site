/**
 * POST /api/ai/compare
 *
 * Compară 2–3 produse din aceeași categorie folosind Google Gemini.
 * Încarcă specificațiile din DB, construiește promptul și returnează JSON structurat.
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getProductsByIds } from "@/lib/db-products";
import { formatPrice } from "@/lib/products";

/** Payload trimis de frontend — date minime per produs */
interface CompareProductPayload {
  id:          string;
  name:        string;
  price:       number;
  priceLabel?: string;
  imageUrl?:   string | null;
  detailHref?: string;
}

interface RequestBody {
  products?: CompareProductPayload[];
}

export interface CompareAiResult {
  product1Analysis:  string;
  product2Analysis:  string;
  product3Analysis?: string;
  generalConclusion: string;
}

/** Răspuns fallback când Gemini e indisponibil */
const FALLBACK_RESULT: CompareAiResult = {
  product1Analysis:  "",
  product2Analysis:  "",
  generalConclusion:
    "Serverele AI sunt momentan aglomerate. Te rugăm să încerci din nou în câteva momente.",
};

// Client Gemini — singleton la nivel de modul
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
);

/** Instrucțiuni de sistem — format JSON strict, analiză per produs + concluzie */
function buildSystemInstruction(productCount: number): string {
  const analysisKeys = Array.from(
    { length: productCount },
    (_, i) => `"product${i + 1}Analysis"`,
  );

  const jsonShape = [
    ...analysisKeys.map((key) => `  ${key}: "..."`),
    `  "generalConclusion": "..."`,
  ].join(",\n");

  const analysisRules = Array.from(
    { length: productCount },
    (_, i) =>
      `- Pentru "product${i + 1}Analysis", textul TREBUIE să înceapă obligatoriu cu linia exactă "Specificații tehnice:" pe primul rând, urmată de maximum 5 linii scurte de specificații (câte una pe rând). Fiecare linie de specificație trebuie să aibă maximum 3-5 cuvinte și să conțină DOAR caracteristici brute (fără propoziții descriptive, fără explicații, fără opinii). Format per linie de specificație: "Etichetă: valoare" (exemplu: "Nuclee: 20", "Frecvență: 5.6 GHz", "TDP: 125 W"). Interzis: liniuțe, bullet points, alte titluri, propoziții lungi. Keep the description extremely concise. Focus only on the main advantage. DO NOT write long paragraphs.`,
  ).join("\n");

  const conclusionLines = Array.from(
    { length: productCount },
    (_, i) => `[Nume Produs ${i + 1}] - recomandare pentru [scenariu scurt]`,
  ).join("\\n");

  const conclusionExample = `Concluzie:\\n${conclusionLines}`;

  return `Ești un expert obiectiv în hardware și tehnologie. Compari ${productCount} produse din aceeași categorie în limba română.

Reguli stricte:
- Nu folosi emoji sau simboluri decorative.
- Fii factual; nu favoriza un produs fără argumente.
- Nu folosi niciodată abrevierea "pt"; scrie întotdeauna cuvântul complet "pentru".
- Răspunde NUMAI cu un obiect JSON valid, fără text suplimentar, fără markdown, fără blocuri de cod.
- Formatul răspunsului trebuie să fie EXACT:
{
${jsonShape}
}

Conținut obligatoriu:
${analysisRules}
- Pentru "generalConclusion", textul TREBUIE să înceapă obligatoriu cu linia exactă "Concluzie:" pe primul rând, urmată de câte o recomandare per produs (câte una pe rând, separate prin \\n). Fiecare recomandare TREBUIE să urmeze structura: "[Nume Produs] - recomandare pentru [scurt scenariu de utilizare]". Maximum 10 cuvinte per recomandare. Folosește numele real al produsului, nu "Produs 1". Exemplu: "${conclusionExample}".

Nu include nicio altă cheie în afara celor de mai sus.`;
}

/** Bloc text cu date produs pentru promptul user (nume, preț, specs din DB) */
function buildProductBlock(
  index: number,
  payload: CompareProductPayload,
  specs: string | null,
  description: string | null,
): string {
  const priceText = payload.priceLabel ?? formatPrice(payload.price);

  return `
Produs ${index + 1}:
- Nume: ${payload.name}
- Preț: ${priceText}
- Descriere: ${description?.trim() || "Nedisponibilă"}
- Specificații: ${specs?.trim() || "Nedisponibile"}
`.trim();
}

/** Parsează răspunsul Gemini — elimină markdown ```json și mapează câmpurile */
function parseCompareResponse(raw: string, productCount: number): CompareAiResult {
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  const result: CompareAiResult = {
    product1Analysis:  String(parsed.product1Analysis ?? ""),
    product2Analysis:  String(parsed.product2Analysis ?? ""),
    generalConclusion: String(parsed.generalConclusion ?? ""),
  };

  if (productCount >= 3) {
    result.product3Analysis = String(parsed.product3Analysis ?? "");
  }

  return result;
}

/** Extrage array ordonat de analize pentru frontend */
function analysesFromResult(result: CompareAiResult, productCount: number): string[] {
  const values = [
    result.product1Analysis,
    result.product2Analysis,
    result.product3Analysis ?? "",
  ];
  return values.slice(0, productCount);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { products } = body;

    if (!Array.isArray(products) || products.length < 2 || products.length > 3) {
      return NextResponse.json(
        { error: "Between 2 and 3 products are required for comparison." },
        { status: 400 },
      );
    }

    const ids = products.map((p) => p.id);
    const dbProducts = await getProductsByIds(ids);
    const dbById = new Map(dbProducts.map((p) => [p.id, p]));

    // Validare server-side: toate produsele trebuie să fie din aceeași categorie
    const categories = dbProducts.map((p) => p.category);
    if (categories.length > 0 && new Set(categories).size > 1) {
      return NextResponse.json(
        { error: "Nu poți compara produse din categorii diferite." },
        { status: 400 },
      );
    }

    const productCount = products.length;
    const analysisFields = Array.from(
      { length: productCount },
      (_, i) => `"product${i + 1}Analysis"`,
    ).join(", ");

    const userMessage = `
Compară următoarele ${productCount} produse. Pentru ${analysisFields}, începe fiecare câmp cu "Specificații tehnice:" pe prima linie, apoi specificații scurte (max 3-6 cuvinte/linie, format "Etichetă: valoare"). Pentru "generalConclusion", începe cu "Concluzie:" pe prima linie, apoi câte o recomandare per produs: "[Nume Produs] - recomandare pentru [scenariu]" (max 10 cuvinte/recomandare; nu folosi "pt").

${products
  .map((payload, index) => {
    const dbProduct = dbById.get(payload.id);
    return buildProductBlock(
      index,
      payload,
      dbProduct?.specs ?? null,
      dbProduct?.description ?? null,
    );
  })
  .join("\n\n")}
`.trim();

    const model = genAI.getGenerativeModel({
      model:             "gemini-2.5-flash",
      systemInstruction: buildSystemInstruction(productCount),
    });

    try {
      const result = await model.generateContent(userMessage);
      const raw = result.response.text();
      const comparison = parseCompareResponse(raw, productCount);
      return NextResponse.json({
        ...comparison,
        analyses: analysesFromResult(comparison, productCount),
      });
    } catch (geminiErr) {
      // Nu returnăm 500 — frontend primește mesaj prietenos
      console.error("[ai/compare POST] Gemini error:", geminiErr);
      return NextResponse.json({
        ...FALLBACK_RESULT,
        analyses: analysesFromResult(FALLBACK_RESULT, productCount),
      });
    }
  } catch (err) {
    console.error("[ai/compare POST]", err);
    return NextResponse.json(
      { error: "Comparația AI a eșuat. Verificați cheia API și încercați din nou." },
      { status: 500 },
    );
  }
}
