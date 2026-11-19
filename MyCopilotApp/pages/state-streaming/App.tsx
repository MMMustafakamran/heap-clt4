// HARNESS: the State Streaming page shows only DocumentView and no App / provider / chat.
// Built on the quickstart's App.tsx + ChatScreen (same provider, same "default" agent).
import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import { View } from "react-native";
import { ChatScreen } from "../../src/ChatScreen"; // HARNESS: quickstart chat, the page shows none
import { DocumentView } from "./src/DocumentView";

// HARNESS: per-page runtime on the harness runtime server :8183 (Android emulator host alias)
const runtimeUrl = "http://10.0.2.2:8183/api/state-streaming/copilotkit";

export default function App() {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl}>
      <View style={{ flex: 1 }}>
        <DocumentView />
        <ChatScreen />
      </View>
    </CopilotKitProvider>
  );
}
