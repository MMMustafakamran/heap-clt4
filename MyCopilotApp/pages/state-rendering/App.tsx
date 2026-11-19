// Doc: https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/state-rendering (App.tsx, verbatim except runtimeUrl)
import { View } from "react-native";
import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import { CopilotChat } from "@copilotkit/react-native/components";
import { ResearchProgress } from "./src/ResearchProgress";

// HARNESS: doc has "http://localhost:8200/api/copilotkit"; per-page runtime on :8183 via the emulator alias.
const runtimeUrl = "http://10.0.2.2:8183/api/state-rendering/copilotkit";

export default function App() {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl}>
      <View style={{ flex: 1 }}>
        <ResearchProgress />
        <CopilotChat agentName="researcher" />
      </View>
    </CopilotKitProvider>
  );
}
