// Doc: https://docs.copilotkit.ai/react-native/claude-sdk-typescript/shared-state/streaming (src/DocumentView.tsx, verbatim)
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useAgent, UseAgentUpdate } from "@copilotkit/react-native/headless";

export function DocumentView() {
  const { agent } = useAgent({
    agentId: "default",
    updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const document = (agent.state as { document?: string } | undefined)?.document ?? "";

  return (
    <View style={{ padding: 16, gap: 8 }}>
      {agent.isRunning ? <ActivityIndicator /> : null}
      <ScrollView style={{ maxHeight: 320 }}>
        <Text>{document}</Text>
      </ScrollView>
    </View>
  );
}
