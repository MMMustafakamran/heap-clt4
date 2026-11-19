// HARNESS: the Agent Config page shows no React Native code at all (no App / provider / chat / config UI).
// Built on the quickstart's App.tsx + ChatScreen, plus the tester's AgentConfigPanel.
import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import { View } from "react-native";
import { ChatScreen } from "../../src/ChatScreen"; // HARNESS: quickstart chat
import { AgentConfigPanel } from "./src/AgentConfigPanel"; // HARNESS: not on the page

// HARNESS: per-page runtime on the harness runtime server :8183 (Android emulator host alias)
const runtimeUrl = "http://10.0.2.2:8183/api/agent-config/copilotkit";

export default function App() {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl}>
      <View style={{ flex: 1 }}>
        <AgentConfigPanel />
        <ChatScreen />
      </View>
    </CopilotKitProvider>
  );
}
