import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { getProductCatalogForAi } from "@/lib/db-products";

const aiSearchSchema = z.object({
  recommendedIds: z
    .array(z.string().uuid())
    .describe("UUID-urile produselor care se potrivesc cel mai bine cererii utilizatorului"),
  explanation: z
    .string()
    .describe("Scurtă explicație în limba română de ce au fost alese aceste produse"),
});

type AiSearchResult = {
  recommendedIds: string[];
  explanation: string;
};

export async function runAiProductSearch(query: string): Promise<AiSearchResult> {
  const catalog = await getProductCatalogForAi();

  if (catalog.length === 0) {
    return {
      recommendedIds: [],
      explanation: "Momentan nu există produse în catalog.",
    };
  }

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: aiSearchSchema,
    schemaName: "ProductRecommendations",
    schemaDescription:
      "Recomandări de produse BuildTech pe baza cererii utilizatorului",
    system:
      "Ești asistentul de recomandări al magazinului online BuildTech. " +
      "Analizezi catalogul de produse și alegi doar ID-uri valide din listă. " +
      "Răspunde mereu în limba română. Oferă răspunsuri extrem de scurte: maximum 1-2 propoziții scurte.",
    prompt: `Cererea utilizatorului: "${query}"

Catalog produse (JSON):
${JSON.stringify(catalog, null, 2)}

Alege produsele cele mai relevante (maxim 8). Returnează doar ID-uri care există în catalog.`,
  });

  const validIds = new Set(catalog.map((p) => p.id));
  const recommendedIds = object.recommendedIds.filter((id) => validIds.has(id));

  return {
    recommendedIds,
    explanation: object.explanation,
  };
}
