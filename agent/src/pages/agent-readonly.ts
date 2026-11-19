// Agent Read-Only Context (/react-native/claude-sdk-typescript/shared-state/agent-readonly).
// The page's only backend code is an indented excerpt of the showcase's agent_server.ts (context folded into
// systemPrompt). HARNESS: the handler around it (quickstart adapter + SSE) is not on the page.
import type { Express } from "express"; // HARNESS
import type { RunAgentInput } from "@ag-ui/core"; // HARNESS
import { QUICKSTART_SYSTEM_PROMPT, quickstartAgent, streamAdapter } from "./state-plain.harness.js"; // HARNESS

export function registerAgentReadonly(app: Express) { // HARNESS
  app.post("/agent-readonly", (req, res) => { // HARNESS
    const input = req.body as RunAgentInput; // HARNESS
    let systemPrompt = QUICKSTART_SYSTEM_PROMPT; // HARNESS: the excerpt appends to a systemPrompt it never declares
    {
      // DOC: agent_server.ts
      if (input.context && input.context.length > 0) {
        const contextStr = input.context
          .map((c: any) => `${c.description}: ${c.value}`)
          .join("\n");
        systemPrompt += `\n\nContext:\n${contextStr}`;
      }
      // END DOC
    }
    streamAdapter(res, input, quickstartAgent(systemPrompt)); // HARNESS
  });
}
