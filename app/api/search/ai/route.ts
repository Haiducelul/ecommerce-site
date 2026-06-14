import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAiProductSearch } from "@/lib/ai-product-search";

export const maxDuration = 60;

const bodySchema = z.object({
  query: z.string().min(3),
});

export async function POST(req: NextRequest) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_GENERATIVE_AI_API_KEY nu este configurat." },
      { status: 500 }
    );
  }

  const body   = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Cererea de căutare este invalidă." }, { status: 400 });
  }

  try {
    const result = await runAiProductSearch(parsed.data.query);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/search/ai POST]", err);
    return NextResponse.json(
      { error: "Eroare la generarea recomandărilor AI." },
      { status: 500 }
    );
  }
}
