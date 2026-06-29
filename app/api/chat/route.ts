import { google } from "@ai-sdk/google";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

const SYSTEM_PROMPT =
  "You are Volt, the customer support AI for BuildTech online store. Answer strictly in Romanian. Keep every response short and natural — maximum 2-3 sentences. Never write lists or long explanations unless the user explicitly asks for details. Be friendly and direct.";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY nu este configurat." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpul cererii este invalid." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "Mesajele lipsesc sau sunt invalide." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[api/chat POST]", err);
    return new Response(
      JSON.stringify({ error: "Eroare server la generarea răspunsului." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
