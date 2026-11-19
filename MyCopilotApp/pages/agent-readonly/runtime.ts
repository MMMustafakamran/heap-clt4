// HARNESS: the Agent Read-Only Context page shows no runtime / server snippet. Quickstart server.ts runtime, with
// the "default" agent pointed at the page's Claude agent (agent/src/rn-state.ts, :8186/agent-readonly)
// instead of the quickstart's BuiltInAgent, since the page's context is read by that Claude Agent SDK TypeScript agent.
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8186/agent-readonly" }),
  },
});

export default runtime;
