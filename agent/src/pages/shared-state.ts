// Shared State page (/react-native/claude-sdk-typescript/shared-state), Claude Agent SDK TypeScript backend.
// Every block between "DOC:" and "END DOC" is verbatim from the rendered page. Everything else is marked HARNESS:
// the page shows only excerpts of the showcase's agent_server.ts / claude-sdk-agent-adapter.ts and never
// defines runAgenticLoop, runWithClaudeAgentSdk, executeBackendTool, hasHeader, hasStructuredUserContent,
// zodShapeFromJsonSchema, normalizeClaudeAgentSdkModel, Emit, ExecuteTool, CLAUDE_MODEL or the
// Messages-API fallback (FINDINGS: shared-state, level 1).
import type { Express, Request, Response } from "express"; // HARNESS: imports never shown
import { randomUUID } from "node:crypto"; // HARNESS
import { EventType, type RunAgentInput } from "@ag-ui/core"; // HARNESS
import { EventEncoder } from "@ag-ui/encoder"; // HARNESS
import { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk"; // HARNESS
import {
  tool as sdkTool,
  createSdkMcpServer,
  type McpServerConfig,
} from "@anthropic-ai/claude-agent-sdk"; // HARNESS: the page calls sdkTool / createSdkMcpServer, never imports them
import type Anthropic from "@anthropic-ai/sdk"; // HARNESS
import { z } from "zod"; // HARNESS

// HARNESS: types the excerpts use but never define
export type Emit = (event: any) => void;
export type ToolResult = { resultText: string; state?: Record<string, unknown> };
export type ExecuteTool = (
  toolName: string,
  toolInput: Record<string, unknown>,
  state: Record<string, unknown>,
  emit: Emit,
) => Promise<ToolResult>;
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-8"; // HARNESS: quickstart default model
const normalizeClaudeAgentSdkModel = (model: string) => model; // HARNESS: helper never shown
const hasHeader = (headers: Record<string, string>, name: string) => // HARNESS: helper never shown
  Object.keys(headers).some((k) => k.toLowerCase() === name.toLowerCase());
const hasStructuredUserContent = (input: RunAgentInput) => // HARNESS: helper never shown
  (input.messages ?? []).some((m: any) => m.role === "user" && Array.isArray(m.content));
// HARNESS: helper never shown; minimal JSON-schema -> zod shape for the page's string / string[] tool args
function zodShapeFromJsonSchema(schema: any): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required: string[] = schema?.required ?? [];
  for (const [key, prop] of Object.entries<any>(schema?.properties ?? {})) {
    let t: z.ZodTypeAny = prop?.type === "array" ? z.array(z.string()) : z.string();
    if (!required.includes(key)) t = t.optional();
    shape[key] = t.describe(prop?.description ?? "");
  }
  return shape;
}

// DOC: shared-state-read-write-prompt.ts
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
// END DOC

// DOC: claude-agent-sdk-adapter.ts (shouldUseClaudeAgentSdk)
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
// END DOC

// DOC: claude-agent-sdk-adapter.ts (createClaudeAgentAdapter)
function createClaudeAgentAdapter({
  toolSchemas,
  emit,
  getState,
  setState,
  executeTool,
  model,
  systemPrompt,
}: {
  toolSchemas: Anthropic.Tool[];
  emit: Emit;
  getState: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  executeTool: ExecuteTool;
  model: string;
  systemPrompt: string;
}) {
  const backendToolServer = buildBackendToolServer({
    toolSchemas,
    emit,
    getState,
    setState,
    executeTool,
  });

  return new ClaudeAgentAdapter({
    agentId: "claude-sdk-typescript",
    model: normalizeClaudeAgentSdkModel(model),
    systemPrompt,
    tools: [],
    mcpServers: backendToolServer.mcpServers,
    allowedTools: backendToolServer.allowedTools,
    permissionMode: "dontAsk",
    maxTurns: 10,
  });
}
// END DOC

// DOC: claude-agent-sdk-adapter.ts (buildBackendToolServer)
const COPILOTKIT_MCP_SERVER_NAME = "copilotkit";
const COPILOTKIT_TOOL_PREFIX = `mcp__${COPILOTKIT_MCP_SERVER_NAME}__`;

function buildBackendToolServer({
  toolSchemas,
  emit,
  getState,
  setState,
  executeTool,
}: {
  toolSchemas: Anthropic.Tool[];
  emit: Emit;
  getState: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  executeTool: ExecuteTool;
}): {
  mcpServers?: Record<string, McpServerConfig>;
  allowedTools: string[];
} {
  if (toolSchemas.length === 0) {
    return { allowedTools: [] };
  }

  const tools = toolSchemas.map((schema) =>
    sdkTool(
      schema.name,
      schema.description ?? "",
      zodShapeFromJsonSchema(schema.input_schema),
      async (args) => {
        try {
          const result = await executeTool(
            schema.name,
            args as Record<string, unknown>,
            getState(),
            emit,
          );
          if (result.state) {
            setState(result.state);
          }
          return {
            content: [{ type: "text" as const, text: result.resultText }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    ),
  );

  return {
    mcpServers: {
      [COPILOTKIT_MCP_SERVER_NAME]: createSdkMcpServer({
        name: COPILOTKIT_MCP_SERVER_NAME,
        version: "1.0.0",
        tools,
      }),
    },
    allowedTools: toolSchemas.map(
      (schema) => `${COPILOTKIT_TOOL_PREFIX}${schema.name}`,
    ),
  };
}
// END DOC

// HARNESS: runWithClaudeAgentSdk is never shown. Runs the doc's createClaudeAgentAdapter for one request and
// forwards its AG-UI events through `emit`; setState emits a STATE_SNAPSHOT (the page says "the adapter emits
// that state as a snapshot after the tool result"). onEvent lets the state-streaming page watch the stream.
export async function runWithClaudeAgentSdk(opts: {
  input: RunAgentInput;
  emit: Emit;
  runId: string;
  threadId: string;
  systemPrompt: string;
  toolSchemas: Anthropic.Tool[];
  initialState: Record<string, unknown>;
  model: string;
  forwardedHeaders: Record<string, string>;
  executeTool: ExecuteTool;
}): Promise<void> {
  let current = opts.initialState;
  const adapter = createClaudeAgentAdapter({
    toolSchemas: opts.toolSchemas,
    emit: opts.emit,
    getState: () => current,
    setState: (s) => {
      current = s;
      opts.emit({ type: EventType.STATE_SNAPSHOT, snapshot: s });
    },
    executeTool: opts.executeTool,
    model: opts.model,
    systemPrompt: opts.systemPrompt,
  });
  await new Promise<void>((resolve) => {
    adapter
      .run({ ...opts.input, runId: opts.runId, threadId: opts.threadId, state: current })
      .subscribe({
        next: (event) => opts.emit(event),
        error: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          opts.emit({ type: EventType.RUN_ERROR, runId: opts.runId, threadId: opts.threadId, message });
          resolve();
        },
        complete: () => resolve(),
      });
  });
}

// HARNESS: other group-C pages register their backend tools here (executeBackendTool's other branches are never shown)
export const EXTRA_BACKEND_TOOLS: Record<string, ExecuteTool> = {};

// HARNESS: executeBackendTool is never shown; only its set_notes branch is.
export async function executeBackendTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  state: Record<string, unknown>,
  toolEmit: Emit,
  _forwardedHeaders: Record<string, string>,
  _contextString: string,
): Promise<ToolResult> {
  // DOC: agent_server.ts (set_notes handler)
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
  // END DOC
  const extra = EXTRA_BACKEND_TOOLS[toolName]; // HARNESS
  if (extra) return extra(toolName, toolInput, state, toolEmit); // HARNESS
  return { resultText: JSON.stringify({ status: "error", error: `unknown tool ${toolName}` }) }; // HARNESS
}

// HARNESS: runAgenticLoop is never shown (signature from the route excerpt). SSE setup copied from the quickstart.
export async function runAgenticLoop(
  req: Request,
  res: Response,
  config: {
    systemPrompt: string;
    toolSchemas: Anthropic.Tool[];
    initialState: Record<string, unknown>;
    model?: string;
    enableThinking?: boolean;
  },
): Promise<void> {
  const input = req.body as RunAgentInput;
  const runId = input.runId ?? randomUUID();
  const threadId = input.threadId ?? randomUUID();
  const encoder = new EventEncoder();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const emit: Emit = (event) => res.write(encoder.encodeSSE(event));
  const forwardedHeaders: Record<string, string> = {};
  const runtimeTools = input.tools ?? [];
  const contextString = (input.context ?? []).map((c) => `${c.description}: ${c.value}`).join("\n");
  const systemPrompt = config.systemPrompt;
  const state = config.initialState;

  // DOC: agent_server.ts (Claude Agent SDK path selection)
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
  // END DOC

  // HARNESS: the page says other requests "use the direct Anthropic Messages API fallback" but never shows it.
  emit({ type: EventType.RUN_STARTED, runId, threadId });
  emit({
    type: EventType.RUN_ERROR,
    runId,
    threadId,
    message: "HARNESS: Messages API fallback path is not shown on the page",
  });
  res.end();
}

// HARNESS: the route excerpt uses `app`; wrapped so rn-state.ts can mount it
export function registerSharedState(app: Express) {
  // DOC: agent_server.ts (route)
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
  // END DOC
}
