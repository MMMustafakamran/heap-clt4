import { CopilotKitProvider } from "@copilotkit/react-native/headless";
import { Platform } from "react-native";
import { ChatScreen } from "./src/ChatScreen";

// HARNESS: port 8200 -> 8181 (harness port block 815x; the runtime is started with the doc's own PORT=8181)
const runtimeUrl =
  Platform.OS === "android"
    ? "http://10.0.2.2:8181/api/copilotkit"
    : "http://localhost:8181/api/copilotkit";

export default function App() {
  return (
    <CopilotKitProvider runtimeUrl={runtimeUrl}>
      <ChatScreen />
    </CopilotKitProvider>
  );
}
