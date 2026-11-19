// HARNESS (whole file): group C ("state") agent server for the Claude Agent SDK TypeScript RN pages.
// Modelled on the quickstart's agent-server.ts (express, dotenv, GET /health, port from AGENT_PORT).
// One POST route per page; each page's doc code lives in src/pages/<id>.ts.
import express from "express";
import dotenv from "dotenv";
import { registerSharedState } from "./pages/shared-state.js";
import { register as registerSharedStateRendering } from "./pages/shared-state-rendering.js";
import { registerAgentReadonly } from "./pages/agent-readonly.js";
import { register as registerHitlHeadless } from "./pages/hitl-headless.js";
import { register as registerGovernedActions } from "./pages/governed-actions.js";
import { registerSubagents } from "./pages/subagents.js";
import { registerStateStreaming } from "./pages/state-streaming.js";
import { registerAgentConfig } from "./pages/agent-config.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

registerSharedState(app); // POST /shared-state-read-write (the doc's own path)
registerSharedStateRendering(app); // POST /shared-state-rendering
registerAgentReadonly(app); // POST /agent-readonly
registerHitlHeadless(app); // POST /hitl-headless
registerGovernedActions(app); // POST /governed-actions
registerSubagents(app); // POST /subagents
registerStateStreaming(app); // POST /state-streaming
registerAgentConfig(app); // POST /agent-config

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env.AGENT_PORT ?? 8186);
app.listen(port, () => {
  console.log(`Claude Agent SDK (group C, state) listening on http://localhost:${port}`);
});
