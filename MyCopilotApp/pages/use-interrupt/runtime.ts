// HARNESS: the page shows no server/runtime snippet. Quickstart server.ts runtime, with the
// BuiltInAgent swapped for the page's Claude Agent SDK agent (HttpAgent -> agent/src/rn-genui.ts :8185/use-interrupt),
// registered as "default" so the page's chat/hooks reach it without an agentId.
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8185/use-interrupt" }),
  },
});

export default runtime;
