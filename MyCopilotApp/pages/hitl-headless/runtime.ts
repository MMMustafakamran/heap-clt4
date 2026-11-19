// HARNESS: the page shows no server/runtime snippet. Quickstart server.ts runtime, with the
// BuiltInAgent swapped for the page's Claude agent (HttpAgent -> agent/src/rn-state.ts :8186/hitl-headless),
// registered as "default" so the page's chat/hooks reach it without an agentId.
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8186/hitl-headless" }),
  },
});

export default runtime;
