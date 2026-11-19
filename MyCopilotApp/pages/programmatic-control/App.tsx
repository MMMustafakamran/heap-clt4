// HARNESS: the page shows src/AgentTrigger.tsx and src/useMeetingRequest.ts (verbatim, in src/),
// plus bare excerpts (runTool, agent.subscribe) but no App/provider and no view that renders
// `request`. Provider = quickstart App.tsx; everything in this file is harness glue.
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { CopilotKitProvider, useAgent } from "@copilotkit/react-native/headless";
import { AgentTrigger } from "./src/AgentTrigger";
import { useMeetingRequest } from "./src/useMeetingRequest";

const runtimeUrl = "http://10.0.2.2:8183/api/programmatic-control/copilotkit"; // HARNESS: harness runtime host

// HARNESS: the doc's "Subscribing to agent events" excerpt, wrapped in a component (setStatus/agent
// are undefined in the excerpt).
function RunStatus() {
  const { agent } = useAgent({ agentId: "default" });
  const [status, setStatus] = useState("idle");
  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunStartedEvent: () => setStatus("working"),
      onRunFinalized: () => setStatus("done"),
      onRunFailed: () => setStatus("failed"),
    });
    return unsubscribe;
  }, [agent]);
  return <Text>status: {status}</Text>;
}

// HARNESS: the doc says "Render `request` in any view, and call answer(...)"; this is that view.
function MeetingRequestButtons() {
  const { request, answer } = useMeetingRequest();
  if (!request) return null;
  return (
    <View>
      <Text>Pick a time for: {request.topic}</Text>
      <Button title="Tomorrow 10:00" onPress={() => answer({ chosen_time: "Tomorrow 10:00" })} />
      <Button title="Cancel" onPress={() => answer({ cancelled: true })} />
    </View>
  );
}

export default function App() {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl}>
      <View style={{ flex: 1, padding: 16 }}>
        <RunStatus />
        <AgentTrigger agentId="default" />
        <MeetingRequestButtons />
      </View>
    </CopilotKitProvider>
  );
}
