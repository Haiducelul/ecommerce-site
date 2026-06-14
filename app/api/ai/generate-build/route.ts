import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ProductPayload {
  id:          string;
  name:        string;
  price:       number;
  subcategory: string;
}

interface RequestBody {
  prompt:            string;
  availableProducts: ProductPayload[];
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "");

const SYSTEM_INSTRUCTION = `Ești un expert în asamblarea calculatoarelor. Pe baza descrierii utilizatorului, alege câte un produs din lista disponibilă pentru fiecare slot necesar (cpu, placa_baza, gpu, ram, sursa, carcasa, stocare).

Reguli stricte:
- Alege EXCLUSIV produse din lista furnizată. Nu inventa produse.
- Răspunde NUMAI cu un obiect JSON valid, fără text suplimentar, fără markdown, fără explicații în afara câmpului "explanation".
- Respectă bugetul și cerințele utilizatorului cât mai fidel posibil.
- Formatul răspunsului trebuie să fie exact:
{
  "build": {
    "cpu": "<id produs>",
    "placa_baza": "<id produs>",
    "gpu": "<id produs>",
    "ram": "<id produs>",
    "sursa": "<id produs>",
    "carcasa": "<id produs>",
    "stocare": "<id produs>"
  },
  "explanation": "<1-2 propoziții în română despre alegerile făcute>"
}
- Dacă nu există produse disponibile pentru un slot, omite acel câmp din "build".
- Nu include nicio altă cheie în afara "build" și "explanation".`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { prompt, availableProducts } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "No prompt provided." }, { status: 400 });
    }

    if (!Array.isArray(availableProducts) || availableProducts.length === 0) {
      return NextResponse.json({ error: "No products available." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model:             "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const userMessage = `
Cerința utilizatorului: "${prompt}"

Produse disponibile în magazin (folosește NUMAI acestea):
${JSON.stringify(availableProducts, null, 2)}

Generează configurația optimă ca JSON.
`.trim();

    const result   = await model.generateContent(userMessage);
    const raw      = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps in ```json ... ```
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: { build: Record<string, string>; explanation: string };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[generate-build] Failed to parse Gemini JSON:", jsonText);
      return NextResponse.json({ error: "AI a returnat un format invalid." }, { status: 500 });
    }

    // Resolve product IDs → full product objects
    const byId = Object.fromEntries(availableProducts.map((p) => [p.id, p]));
    const resolvedBuild: Record<string, ProductPayload> = {};
    for (const [slot, id] of Object.entries(parsed.build ?? {})) {
      if (byId[id]) resolvedBuild[slot] = byId[id];
    }

    return NextResponse.json({
      build:       resolvedBuild,
      explanation: parsed.explanation ?? "",
    });
  } catch (err) {
    console.error("[generate-build] error:", err);
    return NextResponse.json({ error: "Generarea configurației a eșuat." }, { status: 500 });
  }
}
