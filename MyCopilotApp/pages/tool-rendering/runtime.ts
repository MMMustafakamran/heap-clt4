// HARNESS: the tool-rendering page shows no server/runtime snippet. This is the quickstart server.ts runtime
// with its BuiltInAgent swapped for the page's Claude Agent SDK agent (HttpAgent -> agent/src/rn-genui.ts :8185/tool-rendering),
// served by harness-runtime.ts at /api/tool-rendering/copilotkit.
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: {
    // HARNESS: "default" because the page's chat uses the default agent id
    default: new HttpAgent({ url: "http://localhost:8185/tool-rendering" }),
  },
});

export default runtime;
