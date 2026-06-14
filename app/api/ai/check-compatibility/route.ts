import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComponentPayload {
  id:          string;
  name:        string;
  price:       number;
  subcategory: string;
}

interface RequestBody {
  selectedComponents: ComponentPayload[];
  availableProducts:  ComponentPayload[];
}

// ── Gemini client (module-level singleton) ────────────────────────────────────

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "");

const SYSTEM_INSTRUCTION = `Ești un expert în asamblarea calculatoarelor. Vei analiza compatibilitatea componentelor alese de utilizator și vei oferi recomandări concise în limba română.

Reguli stricte de formatare — respectă-le fără excepție:
- Nu folosi niciun emoji sau simboluri decorative.
- Folosește expresia "tipul de conectare" pentru a descrie soclul/socket-ul procesorului sau al plăcii de bază. Nu folosi niciodată cuvintele "soclu" sau "socket".
- Răspunde concis, structurat, cu titluri bold pentru fiecare secțiune.

Componente analizate — STRICT doar acestea șapte:
Procesor (CPU), Placă de bază, Placă video (GPU), Memorie RAM, Sursă de alimentare, Carcasă, Stocare.
- Magazinul NU vinde coolere de procesor, ventilatoare sau orice soluție de răcire. Nu menționează niciodată lipsa unui cooler, a unui ventilator sau a unui sistem de răcire — nici ca avertisment, nici ca componentă lipsă, nici în concluzie. Este strict interzis.

Titluri de secțiuni obligatorii — folosește EXACT aceste formulări, fără variații:
- Pentru compatibilitatea procesor/placă de bază folosește EXACT titlul: "**Compatibilitate procesor cu placa de bază:**"
- Pentru compatibilitatea sursei de alimentare folosește EXACT titlul: "**Compatibilitate sursă și consum:**"
- Pentru RAM folosește EXACT titlul: "**Memorie RAM:**"
- Pentru stocare folosește EXACT titlul: "**Stocare:**"
- Pentru concluzie folosește EXACT titlul: "**Concluzie:**"

Reguli de conținut:
- Analizează: tipul de conectare al procesorului față de placa de bază, tipul de RAM (DDR4/DDR5), wattajul sursei față de consumul estimat al componentelor.
- Dacă procesorul și placa de bază sunt compatibile, scrie EXACT: "**Compatibilitate procesor cu placa de bază:** Placa de bază și procesorul se potrivesc perfect."
- Dacă există o incompatibilitate la orice componentă, recomandă un înlocuitor EXCLUSIV din lista produselor disponibile furnizată. Nu inventa produse care nu există în acea listă.
- Dacă build-ul este incomplet (lipsesc componente din cele șapte de mai sus), menționează ce lipsește și recomandă produse din lista disponibilă.
- Încheie întotdeauna cu secțiunea "**Concluzie:**" de maxim 2 propoziții.`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { selectedComponents, availableProducts } = body;

    if (!Array.isArray(selectedComponents) || selectedComponents.length === 0) {
      return NextResponse.json(
        { error: "No components selected." },
        { status: 400 },
      );
    }

    const model = genAI.getGenerativeModel({
      model:             "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const userMessage = `
Configurația curentă a utilizatorului (componentele selectate):
${JSON.stringify(selectedComponents, null, 2)}

Produsele disponibile în magazin (folosește DOAR acestea pentru recomandări):
${JSON.stringify(availableProducts, null, 2)}

Analizează compatibilitatea configurației și oferă recomandări dacă este necesar.
`.trim();

    const result = await model.generateContent(userMessage);
    const analysis = result.response.text();

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[check-compatibility] Gemini error:", err);
    return NextResponse.json(
      { error: "Analiza AI a eșuat. Verificați cheia API și încercați din nou." },
      { status: 500 },
    );
  }
}
