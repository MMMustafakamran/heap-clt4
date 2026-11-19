// HARNESS: group A (chat) agent server, one POST route per page, modelled on the quickstart's
// agent-server.ts (same SSE handler). Port from AGENT_PORT (8184), never 8000.
import express from "express";
import { randomUUID } from "node:crypto";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import dotenv from "dotenv";
import { agent as prebuiltComponents } from "./pages/prebuilt-components.js";
import { agent as markdown } from "./pages/markdown.js";
import { agent as headlessUi } from "./pages/headless-ui.js";
import { agent as multimodalAttachments } from "./pages/multimodal-attachments.js";
import { agent as programmaticControl } from "./pages/programmatic-control.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const agents = {
  "prebuilt-components": prebuiltComponents,
  markdown,
  "headless-ui": headlessUi,
  "multimodal-attachments": multimodalAttachments,
  "programmatic-control": programmaticControl,
};

for (const [id, agent] of Object.entries(agents)) {
  app.post(`/${id}`, (req, res) => {
    const input = req.body as RunAgentInput;
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
        res.write(encoder.encodeSSE({ type: EventType.RUN_ERROR, runId, threadId, message }));
        res.end();
      },
      complete: () => res.end(),
    });
  });
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", group: "chat", pages: Object.keys(agents) });
});

const port = Number(process.env.AGENT_PORT ?? 8184);
app.listen(port, () => {
  console.log(`rn-chat (group A) listening on http://localhost:${port}`);
});
