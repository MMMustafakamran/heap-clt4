// shared-state-rendering: the page shows React Native frontend code only, no agent code.
// HARNESS (whole file): served by the quickstart's ClaudeAgentAdapter (state-plain.harness.ts).
import type { Express } from "express";
import type { RunAgentInput } from "@ag-ui/core";
import { quickstartAgent, streamAdapter } from "./state-plain.harness.js";

export function register(app: Express) {
  app.post("/shared-state-rendering", (req, res) => streamAdapter(res, req.body as RunAgentInput, quickstartAgent()));
}
