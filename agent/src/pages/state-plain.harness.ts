// HARNESS (group C, whole file): the state / HITL pages show no Claude Agent SDK TypeScript server.
// This is the quickstart's agent-server.ts (/claude-sdk-typescript/quickstart) split into two helpers so
// several page routes can share it: quickstartAgent() = the quickstart ClaudeAgentAdapter, streamAdapter() =
// the quickstart's POST handler body (SSE encoding, RUN_ERROR on failure).
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk";

export const QUICKSTART_SYSTEM_PROMPT = "You are a helpful assistant embedded in a CopilotKit app.";

export function quickstartAgent(systemPrompt: string = QUICKSTART_SYSTEM_PROMPT) {
  return new ClaudeAgentAdapter({
    agentId: "claude-sdk-typescript",
    model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
    systemPrompt,
    tools: [],
    permissionMode: "dontAsk",
    maxTurns: 10,
  });
}

export function streamAdapter(res: Response, body: RunAgentInput, agent: ClaudeAgentAdapter) {
  const input = body;
  const runId = input.runId ?? randomUUID();
  const threadId = input.threadId ?? randomUUID();
  const encoder = new EventEncoder();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  agent.run({ ...input, runId, threadId }).subscribe({
    next: (event) => res.write(encoder.encodeSSE(event)),
    error: (error) => {
      const message = error instanceof Error ? error.message : String(error);
      res.write(
        encoder.encodeSSE({
          type: EventType.RUN_ERROR,
          runId,
          threadId,
          message,
        } as any),
      );
      res.end();
    },
    complete: () => res.end(),
  });
}
