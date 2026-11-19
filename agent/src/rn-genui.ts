// HARNESS: group B (genui) agent server for the RN pages frontend-tools, tool-based, tool-rendering, hitl,
// use-interrupt, state-rendering. Modelled on agent/src/agent-server.ts (the quickstart's ClaudeAgentAdapter server).
import express from "express";
import { randomUUID } from "node:crypto";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk";
import dotenv from "dotenv";
import { createClaudeAgentAdapter, GET_WEATHER_TOOL, executeWeatherTool } from "./pages/tool-rendering.js";
import { app as stateRenderingRoutes } from "./pages/state-rendering.js";
import "./pages/frontend-tools.js"; // page's buildTools excerpt (the published adapter does the conversion itself)
import "./pages/tool-based.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

// The quickstart adapter, verbatim from /claude-sdk-typescript/quickstart. frontend-tools, tool-based, hitl and
// use-interrupt give no runnable agent of their own (use-interrupt's backend snippet renders as "snippet skipped").
function quickstartAgent() {
  return new ClaudeAgentAdapter({
    agentId: "claude-sdk-typescript",
    model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
    systemPrompt: "You are a helpful assistant embedded in a CopilotKit app.",
    tools: [],
    permissionMode: "dontAsk",
    maxTurns: 10,
  });
}

function serve(makeAgent: () => ClaudeAgentAdapter) {
  return (req: express.Request, res: express.Response) => {
    const input = req.body as RunAgentInput;
    const runId = input.runId ?? randomUUID();
    const threadId = input.threadId ?? randomUUID();
    const encoder = new EventEncoder();
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    makeAgent().run({ ...input, runId, threadId }).subscribe({
      next: (event) => res.write(encoder.encodeSSE(event)),
      error: (error) => {
        const message = error instanceof Error ? error.message : String(error);
        res.write(encoder.encodeSSE({ type: EventType.RUN_ERROR, runId, threadId, message } as any));
        res.end();
      },
      complete: () => res.end(),
    });
  };
}

for (const id of ["frontend-tools", "tool-based", "hitl", "use-interrupt"]) {
  app.post(`/${id}`, serve(quickstartAgent));
}

// tool-rendering: the page's createClaudeAgentAdapter with its get_weather tool (wiring never shown on the page)
app.post("/tool-rendering", serve(() => {
  let state: Record<string, unknown> = {};
  return createClaudeAgentAdapter({
    toolSchemas: [GET_WEATHER_TOOL],
    emit: () => {},
    getState: () => state,
    setState: (s: Record<string, unknown>) => { state = s; },
    executeTool: executeWeatherTool,
    model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
    systemPrompt: "You are a helpful assistant embedded in a CopilotKit app.",
  });
}));

// state-rendering: the page's own route, POST /state-rendering/shared-state-read-write
app.use("/state-rendering", stateRenderingRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env.AGENT_PORT ?? 8185);
app.listen(port, () => {
  console.log(`rn-genui Claude agents on http://localhost:${port}`);
});
