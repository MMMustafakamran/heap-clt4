// Agent Config (/react-native/claude-sdk-typescript/agent-config). The page shows agent-config-prompt.ts and a
// pseudo-code "Backend flow" (latestValidConfig(currentRun.context) -> buildSystemPrompt -> model.invoke).
// HARNESS: latestValidConfig and the route are not on the page; the config arrives via useAgentContext
// (the prose's "most agents" path) from the tester's AgentConfigPanel.
import type { Express } from "express"; // HARNESS
import type { RunAgentInput } from "@ag-ui/core"; // HARNESS
import { quickstartAgent, streamAdapter } from "./state-plain.harness.js"; // HARNESS

// DOC: agent-config-prompt.ts
export type Tone = "professional" | "casual" | "enthusiastic";
export type Expertise = "beginner" | "intermediate" | "expert";
export type ResponseLength = "concise" | "detailed";

const DEFAULT_TONE: Tone = "professional";
const DEFAULT_EXPERTISE: Expertise = "intermediate";
const DEFAULT_RESPONSE_LENGTH: ResponseLength = "concise";

const VALID_TONES: ReadonlySet<string> = new Set<Tone>([
  "professional",
  "casual",
  "enthusiastic",
]);
const VALID_EXPERTISE: ReadonlySet<string> = new Set<Expertise>([
  "beginner",
  "intermediate",
  "expert",
]);
const VALID_RESPONSE_LENGTHS: ReadonlySet<string> = new Set<ResponseLength>([
  "concise",
  "detailed",
]);

const TONE_RULES: Record<Tone, string> = {
  professional: "Use neutral, precise language. No emoji. Short sentences.",
  casual:
    "Use friendly, conversational language. Contractions OK. Light humor welcome.",
  enthusiastic:
    "Use upbeat, energetic language. Exclamation points OK. Emoji OK.",
};

const EXPERTISE_RULES: Record<Expertise, string> = {
  beginner: "Assume no prior knowledge. Define jargon. Use analogies.",
  intermediate:
    "Assume common terms are understood; explain specialized terms.",
  expert: "Assume technical fluency. Use precise terminology. Skip basics.",
};

const LENGTH_RULES: Record<ResponseLength, string> = {
  concise: "Respond in 1-3 sentences.",
  detailed: "Respond in multiple paragraphs with examples where relevant.",
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function buildAgentConfigSystemPrompt(
  forwardedProps: Record<string, unknown>,
): string {
  const rawTone = readString(forwardedProps.tone) ?? DEFAULT_TONE;
  const rawExpertise =
    readString(forwardedProps.expertise) ?? DEFAULT_EXPERTISE;
  const rawLength =
    readString(forwardedProps.responseLength) ?? DEFAULT_RESPONSE_LENGTH;

  const tone = (VALID_TONES.has(rawTone) ? rawTone : DEFAULT_TONE) as Tone;
  const expertise = (
    VALID_EXPERTISE.has(rawExpertise) ? rawExpertise : DEFAULT_EXPERTISE
  ) as Expertise;
  const responseLength = (
    VALID_RESPONSE_LENGTHS.has(rawLength) ? rawLength : DEFAULT_RESPONSE_LENGTH
  ) as ResponseLength;

  return [
    "You are a helpful assistant.",
    "",
    `Tone: ${TONE_RULES[tone]}`,
    `Expertise level: ${EXPERTISE_RULES[expertise]}`,
    `Response length: ${LENGTH_RULES[responseLength]}`,
  ].join("\n");
}

export const AGENT_CONFIG_DEFAULT_SYSTEM_PROMPT = buildAgentConfigSystemPrompt(
  {},
);
// END DOC

// HARNESS: "latestValidConfig(currentRun.context)" from the Backend flow block, never defined on the page
function latestValidConfig(context: RunAgentInput["context"]): Record<string, unknown> {
  for (const entry of [...(context ?? [])].reverse()) {
    try {
      const value = typeof entry.value === "string" ? JSON.parse(entry.value) : entry.value;
      if (value && typeof value === "object" && ("tone" in value || "expertise" in value || "responseLength" in value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      /* not JSON */
    }
  }
  return {};
}

export function registerAgentConfig(app: Express) { // HARNESS
  app.post("/agent-config", (req, res) => { // HARNESS
    const input = req.body as RunAgentInput;
    const config = latestValidConfig(input.context); // Backend flow line 1
    const systemPrompt = buildAgentConfigSystemPrompt(config); // Backend flow line 2
    streamAdapter(res, input, quickstartAgent(systemPrompt)); // Backend flow line 3 (HARNESS: quickstart adapter)
  });
}
