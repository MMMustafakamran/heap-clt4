import { Button, Text, View } from "react-native";
import { useAgent, useCopilotKit } from "@copilotkit/react-native/headless";

export function AgentTrigger({ agentId }: { agentId: string }) {
  const { agent } = useAgent({ agentId });
  const { copilotkit } = useCopilotKit();

  const run = async () => {
    if (agent.isRunning) return;

    agent.addMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: "Summarize the latest sales data",
    });

    try {
      await copilotkit.runAgent({ agent });
    } catch (error) {
      console.error("CopilotKit runAgent failed:", error);
    }
  };

  const last = agent.messages[agent.messages.length - 1];

  return (
    <View>
      <Button title="Run agent" onPress={run} disabled={agent.isRunning} />
      <Button
        title="Stop"
        onPress={() => copilotkit.stopAgent({ agent })}
        disabled={!agent.isRunning}
      />
      {last?.role === "assistant" && last.content ? <Text>{last.content}</Text> : null}
    </View>
  );
}
