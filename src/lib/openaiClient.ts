import { COACHING_SYSTEM_PROMPT } from "./coachingPrompt";
import type { CoachingRequest, CoachingResponse } from "../types/coaching";

const API_URL = import.meta.env.VITE_OPENAI_API_BASE?.trim() || "https://api.openai.com/v1/chat/completions";
const MODEL = import.meta.env.VITE_OPENAI_MODEL?.trim() || "gpt-4.1-mini";

export async function getMoveCoaching(input: CoachingRequest, apiKey: string): Promise<CoachingResponse> {
  if (!apiKey) {
    throw new Error("Missing OpenAI API key");
  }

  const payload = {
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: COACHING_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the move context as JSON. Evaluations are centipawns for White (positive = White is better).\n${JSON.stringify(input)}`,
      },
    ],
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI API returned no content");
  }

  try {
    return JSON.parse(content) as CoachingResponse;
  } catch (error) {
    throw new Error(`Unable to parse coaching response: ${String(error)}`);
  }
}
