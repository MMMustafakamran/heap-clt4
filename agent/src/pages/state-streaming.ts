// State Streaming (/react-native/claude-sdk-typescript/shared-state/streaming). The page shows
// src/app/demos/shared-state-streaming/state-streaming-backend.ts (also on the Shared State page) and an
// indented agent_server.ts excerpt that "runs inside the streamed tool-argument handler". HARNESS: that handler,
// the route, the write_document executor and how activeToolCallName / activeToolArgs / lastStreamedDocument /
// state are tracked are never shown (FINDINGS: state-streaming, level 1).
import type { Express } from "express"; // HARNESS
import { randomUUID } from "node:crypto"; // HARNESS
import { type RunAgentInput } from "@ag-ui/core"; // HARNESS
import { EventEncoder } from "@ag-ui/encoder"; // HARNESS
import { CLAUDE_MODEL, EXTRA_BACKEND_TOOLS, executeBackendTool, runWithClaudeAgentSdk, type Emit } from "./shared-state.js"; // HARNESS

// DOC: src/app/demos/shared-state-streaming/state-streaming-backend.ts
import { EventType } from "@ag-ui/core";
import type Anthropic from "@anthropic-ai/sdk";

type StreamingState = {
  document?: string;
};

type ToolDeltaEvent = {
  type: string;
  content_block?: { type: string; name?: string };
  delta?: { type: string; partial_json?: string };
};

export const WRITE_DOCUMENT_TOOL_SCHEMA: Anthropic.Tool = {
  name: "write_document",
  description: "Write a document into shared agent state.",
  input_schema: {
    type: "object",
    properties: {
      document: {
        type: "string",
        description: "The full document text to render in shared state.",
      },
    },
    required: ["document"],
  },
};

export function partialJsonStringProperty(source: string, key: string): string | null { // HARNESS: "export" added, the agent_server.ts excerpt calls it from another file
  // Hand-rolled partial-JSON string extraction with no external dependency
  // (mirrors the Python sibling snippet). Reads the current value of a string
  // property from a partial buffer, tolerating truncation mid-value.
  const marker = JSON.stringify(key);
  const keyPos = source.indexOf(marker);
  if (keyPos < 0) return null;
  const colonPos = source.indexOf(":", keyPos + marker.length);
  if (colonPos < 0) return null;
  const valueStart = source.indexOf('"', colonPos + 1);
  if (valueStart < 0) return null;

  const rawChars: string[] = [];
  let escaped = false;
  for (const char of source.slice(valueStart + 1)) {
    if (escaped) {
      rawChars.push("\\" + char);
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      break;
    } else {
      rawChars.push(char);
    }
  }
  // A buffer truncated mid-escape drops the dangling backslash (matching the
  // Python sibling) so the partial value still parses instead of forcing null.

  try {
    return JSON.parse(`"${rawChars.join("")}"`) as string;
  } catch {
    return null;
  }
}

export function emitStreamingDocumentState(
  event: ToolDeltaEvent,
  tracker: { toolName: string | null; argsJson: string; lastDocument: string },
  state: StreamingState,
  emit: (event: object) => void,
) {
  if (
    event.type === "content_block_start" &&
    event.content_block?.type === "tool_use"
  ) {
    tracker.toolName = event.content_block.name ?? null;
    tracker.argsJson = "";
    return;
  }

  if (
    event.type !== "content_block_delta" ||
    event.delta?.type !== "input_json_delta"
  ) {
    return;
  }

  tracker.argsJson += event.delta.partial_json ?? "";
  if (tracker.toolName !== "write_document") {
    return;
  }

  const streamedDocument = partialJsonStringProperty(
    tracker.argsJson,
    "document",
  );
  if (streamedDocument === null || streamedDocument === tracker.lastDocument) {
    return;
  }

  // Mutate `state` in place but emit a fresh copy each delta, so a consumer
  // that retains a snapshot doesn't see earlier snapshots mutate to the final
  // text as streaming continues. (Mirrors the Python sibling snippet.)
  const snapshot: StreamingState = { ...state, document: streamedDocument };
  state.document = streamedDocument;
  tracker.lastDocument = streamedDocument;
  emit({ type: EventType.STATE_SNAPSHOT, snapshot });
}
// END DOC

// HARNESS: write_document's executor is never shown; it saves the final value, as the page's note asks
EXTRA_BACKEND_TOOLS["write_document"] = async (_name, toolInput, state) => {
  const document = String(toolInput.document ?? "");
  return { resultText: JSON.stringify({ status: "ok" }), state: { ...state, document } };
};

export function registerStateStreaming(app: Express) { // HARNESS: route never shown
  app.post("/state-streaming", async (req, res) => {
    const input = req.body as RunAgentInput;
    const runId = input.runId ?? randomUUID();
    const threadId = input.threadId ?? randomUUID();
    const encoder = new EventEncoder();
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const emit: Emit = (event) => res.write(encoder.encodeSSE(event));
    let state: Record<string, unknown> = { ...((input.state as Record<string, unknown>) ?? {}) };
    let activeToolCallName: string | null = null;
    let activeToolArgs = "";
    let lastStreamedDocument = "";
    // HARNESS: the "streamed tool-argument handler" — watches the adapter's TOOL_CALL_START / TOOL_CALL_ARGS
    const onEvent: Emit = (event) => {
      emit(event);
      if (event.type === "TOOL_CALL_START") {
        activeToolCallName = String(event.toolCallName ?? "").replace(/^mcp__copilotkit__/, "");
        activeToolArgs = "";
      } else if (event.type === "TOOL_CALL_ARGS") {
        activeToolArgs += event.delta ?? "";
        {
          // DOC: agent_server.ts
      if (activeToolCallName === "write_document") {
        const streamedDocument = partialJsonStringProperty(
          activeToolArgs,
          "document",
        );
        if (
          streamedDocument !== null &&
          streamedDocument !== lastStreamedDocument
        ) {
          state = { ...state, document: streamedDocument };
          lastStreamedDocument = streamedDocument;
          emit({ type: EventType.STATE_SNAPSHOT, snapshot: state });
        }
      }
          // END DOC
        }
      }
    };
    await runWithClaudeAgentSdk({
      input,
      emit: onEvent,
      runId,
      threadId,
      systemPrompt: "You are a helpful assistant. When asked to write something, call write_document with the full text.", // HARNESS: no prompt on the page
      toolSchemas: [WRITE_DOCUMENT_TOOL_SCHEMA],
      initialState: state,
      model: CLAUDE_MODEL,
      forwardedHeaders: {},
      executeTool: (n, i, s, e) => executeBackendTool(n, i, s, e, {}, ""),
    });
    res.end();
  });
}
