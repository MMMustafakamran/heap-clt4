// HARNESS: the State Rendering page shows no runtime / server snippet and never registers a "researcher" agent,
// though its App.tsx and ResearchProgress.tsx both use agentName/agentId "researcher". Quickstart server.ts runtime,
// with "researcher" pointed at the page's Claude agent (served in
// agent/src/rn-genui.ts under /state-rendering on :8185).
import { HttpAgent } from "@ag-ui/client";
import { CopilotRuntime } from "@copilotkit/runtime/v2";

const runtime = new CopilotRuntime({
  agents: {
    researcher: new HttpAgent({ url: "http://localhost:8185/state-rendering/shared-state-read-write" }),
  },
});

export default runtime;
