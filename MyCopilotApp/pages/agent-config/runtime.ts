// HARNESS: the Agent Config page shows no runtime / server snippet. Quickstart server.ts runtime, with
// the "default" agent pointed at the page's Claude agent (agent/src/rn-state.ts, :8186/agent-config).
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8186/agent-config" }),
  },
});

export default runtime;
