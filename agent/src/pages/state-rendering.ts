// Doc: https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/state-rendering
// Verbatim: shared-state-read-write-prompt.ts, the agent_server.ts route, shouldUseClaudeAgentSdk, the runAgenticLoop
// excerpt and the set_notes branch. createClaudeAgentAdapter / buildBackendToolServer are the same blocks as on
// tool-rendering (identical text), imported from there. HARNESS lines fill the names the page never defines.
import express, { type Request, type Response } from "express"; // HARNESS: imports never shown
import { randomUUID } from "node:crypto"; // HARNESS
import type Anthropic from "@anthropic-ai/sdk"; // HARNESS
import { EventType, type RunAgentInput } from "@ag-ui/core"; // HARNESS
import { EventEncoder } from "@ag-ui/encoder"; // HARNESS
import { createClaudeAgentAdapter } from "./tool-rendering.js"; // HARNESS: same verbatim adapter blocks as tool-rendering
import type { Emit, ExecuteTool } from "./_genui-harness.js"; // HARNESS: types never defined on the page

// --- shared-state-read-write-prompt.ts (verbatim) ---
export interface Preferences {
  name?: string;
  tone?: "formal" | "casual" | "playful";
  language?: string;
  interests?: string[];
}

export const SHARED_STATE_READ_WRITE_BASE_SYSTEM =
  "You are a helpful, concise assistant. " +
  "The user's preferences are supplied via shared state and will be " +
  "added to the system prompt at the start of every turn. Always " +
  "respect them. " +
  "When the user asks you to remember something, or when you observe " +
  "something worth surfacing in the UI, call `set_notes` with the " +
  "FULL updated list of short note strings (existing notes + new). " +
  "Each note should be under 120 characters.";

export const SET_NOTES_TOOL_SCHEMA = {
  name: "set_notes" as const,
  description:
    "Replace the notes array in shared state with the full updated list. " +
    "Use whenever the user asks you to 'remember' something, or when you " +
    "have an observation worth surfacing in the UI's notes panel. " +
    "Always pass the FULL notes list (existing + new), not a diff. " +
    "Keep each note short (< 120 chars).",
  input_schema: {
    type: "object" as const,
    properties: {
      notes: {
        type: "array",
        items: { type: "string" },
        description:
          "The complete updated notes array. Replaces the current notes.",
      },
    },
    required: ["notes"],
  },
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Coerce an arbitrary `unknown` (e.g. `input.state.preferences`) into a
 * sanitized `Preferences` object. We accept partial shapes — any field
 * may be missing — and silently drop fields that don't match the
 * expected types so a misbehaving frontend can't poison the prompt.
 */
export function coercePreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return {};
  const v = value as Record<string, unknown>;
  const out: Preferences = {};
  if (typeof v.name === "string") out.name = v.name;
  if (v.tone === "formal" || v.tone === "casual" || v.tone === "playful") {
    out.tone = v.tone;
  }
  if (typeof v.language === "string") out.language = v.language;
  if (isStringArray(v.interests)) out.interests = v.interests;
  return out;
}

export function buildPreferencesPreamble(prefs: Preferences): string | null {
  const lines: string[] = [];
  if (prefs.name) lines.push(`- Name: ${prefs.name}`);
  if (prefs.tone) lines.push(`- Preferred tone: ${prefs.tone}`);
  if (prefs.language) lines.push(`- Preferred language: ${prefs.language}`);
  if (prefs.interests && prefs.interests.length > 0) {
    lines.push(`- Interests: ${prefs.interests.join(", ")}`);
  }
  if (lines.length === 0) return null;
  return [
    "The user has shared these preferences with you:",
    ...lines,
    "Tailor every response to these preferences. Address the user by name " +
      "when appropriate.",
  ].join("\n");
}

export function buildSharedStateReadWriteSystemPrompt(
  prefs: Preferences,
): string {
  const preamble = buildPreferencesPreamble(prefs);
  if (!preamble) return SHARED_STATE_READ_WRITE_BASE_SYSTEM;
  return `${SHARED_STATE_READ_WRITE_BASE_SYSTEM}\n\n${preamble}`;
}

// HARNESS: hasHeader and hasStructuredUserContent are used by shouldUseClaudeAgentSdk but never defined
function hasHeader(headers: Record<string, string>, name: string): boolean { // HARNESS
  return Object.keys(headers).some((k) => k.toLowerCase() === name); // HARNESS
} // HARNESS
function hasStructuredUserContent(input: RunAgentInput): boolean { // HARNESS
  return input.messages.some((m) => m.role === "user" && typeof m.content !== "string"); // HARNESS
} // HARNESS

// --- claude-agent-sdk-adapter.ts: shouldUseClaudeAgentSdk (verbatim) ---
export function shouldUseClaudeAgentSdk({
  input,
  forwardedHeaders,
  runtimeToolCount,
  enableThinking,
}: {
  input: RunAgentInput;
  forwardedHeaders: Record<string, string>;
  runtimeToolCount: number;
  enableThinking?: boolean;
}): boolean {
  if ((process.env.ANTHROPIC_BASE_URL ?? "").includes("aimock")) {
    return false;
  }
  // The official adapter keeps a `headers` property for forward compatibility,
  // but the Claude Agent SDK cannot forward per-request HTTP headers today.
  if (hasHeader(forwardedHeaders, "x-aimock-context")) {
    return false;
  }
  if (enableThinking) {
    return false;
  }
  // The official Claude Agent SDK path can execute backend MCP tools, but it
  // does not yet bridge CopilotKit frontend/runtime tools back through AG-UI.
  if (runtimeToolCount > 0) {
    return false;
  }
  if (hasStructuredUserContent(input)) {
    return false;
  }
  return true;
}

// HARNESS: executeBackendTool is never shown; only its set_notes branch (verbatim, inside) is on the page
const executeBackendTool = async ( // HARNESS
  toolName: string, // HARNESS
  toolInput: Record<string, unknown>, // HARNESS
  state: Record<string, unknown>, // HARNESS
  _emit: Emit, // HARNESS
  _forwardedHeaders: Record<string, string>, // HARNESS
  _contextString: string, // HARNESS
): Promise<{ resultText: string; state?: Record<string, unknown> }> => { // HARNESS
  if (toolName === "set_notes") {
    const notes = Array.isArray(toolInput.notes)
      ? (toolInput.notes as unknown[]).filter(
          (note): note is string => typeof note === "string",
        )
      : [];
    return {
      resultText: JSON.stringify({ status: "ok", count: notes.length }),
      state: { ...state, notes },
    };
  }
  return { resultText: `unknown tool ${toolName}` }; // HARNESS
}; // HARNESS

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-8"; // HARNESS: undefined on the page; quickstart default

// HARNESS: runWithClaudeAgentSdk is never shown; runs the page's createClaudeAgentAdapter and streams its events
async function runWithClaudeAgentSdk(opts: { // HARNESS
  input: RunAgentInput; emit: Emit; runId: string; threadId: string; systemPrompt: string; // HARNESS
  toolSchemas: Anthropic.Tool[]; initialState: Record<string, unknown>; model: string; // HARNESS
  forwardedHeaders: Record<string, string>; executeTool: ExecuteTool; // HARNESS
}): Promise<void> { // HARNESS
  let state = opts.initialState; // HARNESS
  const adapter = createClaudeAgentAdapter({ // HARNESS
    toolSchemas: opts.toolSchemas, emit: opts.emit, getState: () => state, // HARNESS
    setState: (s) => { state = s; opts.emit({ type: EventType.STATE_SNAPSHOT, snapshot: s } as any); }, // HARNESS
    executeTool: opts.executeTool, model: opts.model, systemPrompt: opts.systemPrompt, // HARNESS
  }); // HARNESS
  await new Promise<void>((resolve) => { // HARNESS
    adapter.run({ ...opts.input, runId: opts.runId, threadId: opts.threadId, state } as RunAgentInput).subscribe({ // HARNESS
      next: (event) => opts.emit(event as any), // HARNESS
      error: (error) => { opts.emit({ type: EventType.RUN_ERROR, message: String(error) } as any); resolve(); }, // HARNESS
      complete: () => resolve(), // HARNESS
    }); // HARNESS
  }); // HARNESS
} // HARNESS

// HARNESS: runAgenticLoop is never shown; only the Claude SDK branch below (verbatim) is on the page
async function runAgenticLoop( // HARNESS
  req: Request, res: Response, // HARNESS
  config: { systemPrompt: string; toolSchemas: Anthropic.Tool[]; initialState: Record<string, unknown>; model?: string; enableThinking?: boolean }, // HARNESS
): Promise<void> { // HARNESS
  const input = req.body as RunAgentInput; // HARNESS
  const runId = input.runId ?? randomUUID(); // HARNESS
  const threadId = input.threadId ?? randomUUID(); // HARNESS
  const encoder = new EventEncoder(); // HARNESS
  res.setHeader("Content-Type", "text/event-stream"); // HARNESS
  const emit: Emit = (event) => { res.write(encoder.encodeSSE(event as any)); }; // HARNESS
  const forwardedHeaders: Record<string, string> = {}; // HARNESS
  const runtimeTools = input.tools ?? []; // HARNESS
  const systemPrompt = config.systemPrompt; // HARNESS
  const state = config.initialState; // HARNESS
  const contextString = ""; // HARNESS
  if (
    shouldUseClaudeAgentSdk({
      input,
      forwardedHeaders,
      runtimeToolCount: runtimeTools.length,
      enableThinking: config.enableThinking,
    })
  ) {
    await runWithClaudeAgentSdk({
      input,
      emit,
      runId,
      threadId,
      systemPrompt,
      toolSchemas: config.toolSchemas,
      initialState: state,
      model: config.model ?? CLAUDE_MODEL,
      forwardedHeaders,
      executeTool: (toolName, toolInput, currentState, toolEmit) =>
        executeBackendTool(
          toolName,
          toolInput,
          currentState,
          toolEmit,
          forwardedHeaders,
          contextString,
        ),
    });
    res.end();
    return;
  }
  // HARNESS: the direct Messages API fallback is never shown on the page
  emit({ type: EventType.RUN_ERROR, message: "direct Messages API fallback not shown on the page" } as any); // HARNESS
  res.end(); // HARNESS
} // HARNESS

export const app = express.Router(); // HARNESS: the page's `app` is never created; mounted at /state-rendering

// --- agent_server.ts route (verbatim) ---
app.post(
  "/shared-state-read-write",
  async (req: Request, res: Response): Promise<void> => {
    const input = req.body as RunAgentInput;
    const incomingState =
      ((input as any).state as Record<string, unknown> | undefined) ?? {};
    const prefs = coercePreferences(incomingState.preferences);
    const notes = Array.isArray(incomingState.notes)
      ? (incomingState.notes as unknown[]).filter(
          (n): n is string => typeof n === "string",
        )
      : [];
    await runAgenticLoop(req, res, {
      systemPrompt: buildSharedStateReadWriteSystemPrompt(prefs),
      toolSchemas: [SET_NOTES_TOOL_SCHEMA] as Anthropic.Tool[],
      initialState: { preferences: prefs, notes },
    });
  },
);
