// Doc: https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/state-rendering (src/ResearchProgress.tsx, verbatim)
import { Text, View } from "react-native";
import { useAgent, UseAgentUpdate } from "@copilotkit/react-native/headless";

type ResearchState = {
  status?: string;
  draft?: string;
  completed?: number;
  total?: number;
};

export function ResearchProgress() {
  const { agent } = useAgent({
    agentId: "researcher",
    updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const state = (agent.state ?? {}) as ResearchState;

  return (
    <View style={{ padding: 16, gap: 8 }} accessibilityLiveRegion="polite">
      <Text style={{ fontWeight: "600" }}>
        {state.status ?? (agent.isRunning ? "Working..." : "Idle")}
      </Text>
      <Text>
        {state.completed ?? 0} of {state.total ?? "?"} complete
      </Text>
      {state.draft ? <Text>{state.draft}</Text> : null}
    </View>
  );
}
