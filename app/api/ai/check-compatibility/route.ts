/**
 * POST /api/ai/check-compatibility
 *
 * Analizează compatibilitatea unei configurații PC folosind Google Gemini.
 * Primește componentele selectate de utilizator și catalogul disponibil din magazin,
 * apoi returnează un raport scurt în română (status per componentă + scor final).
 */
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";



/** O componentă PC trimisă de client (din coșul de configurare). */
interface ComponentPayload {
  id:          string;
  name:        string;
  price:       number;
  subcategory: string;
}

/** Corpul cererii POST — configurația curentă + produsele din care AI poate recomanda. */
interface RequestBody {
  selectedComponents: ComponentPayload[];
  availableProducts:  ComponentPayload[];
}

// ── Client Gemini (singleton la nivel de modul) ───────────────────────────────

// O singură instanță reutilizată pe durata procesului Node.js
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "");

/**
 * Instrucțiuni de sistem pentru model — definesc formatul răspunsului Volt
 * (emoji status, o linie per componentă, concluzie cu procent compatibilitate).
 */
const SYSTEM_INSTRUCTION = `Ești Volt, asistent pentru compatibilitate PC.
Răspunzi strict în română, foarte concis — exact o linie scurtă per componentă, plus o concluzie finală.

Reguli obligatorii:
- Fiecare linie de componentă începe cu un emoji de status:
  - ✅ pentru componente perfect compatibile
  - ⚠️ pentru alegeri sub-optimale, bottleneck minor sau recomandări de upgrade
  - ❌ pentru incompatibilități reale
- O singură linie per componentă, fără paragrafe, fără bullet-uri.
- Text scurt, natural și util după ":" (maxim o propoziție scurtă).
- Dacă recomanzi înlocuitori, folosește DOAR produse din lista disponibilă.
- Nu menționa coolere/ventilatoare/sisteme de răcire lipsă.
- Încheie ÎNTOTDEAUNA cu secțiunea Concluzie.

Format obligatoriu exact:
✅ Procesor & Placă de bază: <text scurt>
⚠️ Placă Video: <text scurt>
✅ Memorie RAM: <text scurt>
✅ Sursă de alimentare: <text scurt>
✅ Carcasă: <text scurt>
✅ Stocare: <text scurt>

Concluzie
Compatibilitate: <X>%.
<explicație sau recomandare, STRICT sub 20 de cuvinte>

Reguli pentru Concluzie:
- Concluzia are EXACT 3 linii separate, în formatul de mai sus.
- Linia 1: doar cuvântul "Concluzie" (fără ":").
- Linia 2: doar scorul, ex: "Compatibilitate: 85%." (folosește procent).
- Linia 3: maxim 20 de cuvinte, scurtă și directă.
- Dacă există ⚠️ sau ❌, linia 3 menționează explicit ce să schimbi (din lista disponibilă).
- Exemplu linia 3: "Recomandăm RTX 4070 SUPER în locul plăcii video actuale."`;

// ── Handler rută ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { selectedComponents, availableProducts } = body;

    // Validare minimă — trebuie să existe cel puțin o componentă selectată
    if (!Array.isArray(selectedComponents) || selectedComponents.length === 0) {
      return NextResponse.json(
        { error: "No components selected." },
        { status: 400 },
      );
    }

    // Inițializare model Gemini cu promptul de sistem (reguli + format răspuns)
    const model = genAI.getGenerativeModel({
      model:             "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Construim mesajul utilizator: configurația curentă + catalogul din DB (JSON)
    const userMessage = `
Configurația curentă a utilizatorului (componentele selectate):
${JSON.stringify(selectedComponents, null, 2)}

Produsele disponibile în magazin (folosește DOAR acestea pentru recomandări):
${JSON.stringify(availableProducts, null, 2)}

Analizează compatibilitatea configurației și oferă recomandări dacă este necesar.
`.trim();

    // Apel către API-ul Google Generative AI
    const result = await model.generateContent(userMessage);
    const analysis = result.response.text();

    // Răspuns JSON către PcBuilderClient.tsx
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[check-compatibility] Gemini error:", err);
    return NextResponse.json(
      { error: "Analiza AI a eșuat. Verificați cheia API și încercați din nou." },
      { status: 500 },
    );
  }
}
