import { View } from "react-native";
import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import { MeetingRequestPanel } from "./src/MeetingRequestPanel";
import { ChatScreen } from "./src/ChatScreen";

// HARNESS: doc has "http://localhost:8200/api/copilotkit"; per-page runtime on :8183 via the emulator alias.
const runtimeUrl = "http://10.0.2.2:8183/api/hitl-headless/copilotkit";

export default function App() {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl}>
      <View style={{ flex: 1 }}>
        <MeetingRequestPanel />
        <ChatScreen />
      </View>
    </CopilotKitProvider>
  );
}
