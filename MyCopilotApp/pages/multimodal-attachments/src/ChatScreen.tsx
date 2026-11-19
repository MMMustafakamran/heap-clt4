import { useState } from "react";
import { FlatList, Image, Pressable, Text, TextInput, View } from "react-native"; // HARNESS: FlatList for the message list
import { useAgent } from "@copilotkit/react-native/headless"; // HARNESS: message list
import { CopilotChat, useCopilotChatContext } from "@copilotkit/react-native";
import type { NativeFileInput } from "@copilotkit/react-native"; // HARNESS: the callout names it as a type export but shows no import
// Doc callout "expo-file-system 19 and later: pass your own reader" (installed expo-file-system 58), verbatim:
import * as FileSystem from "expo-file-system/legacy";

const attachments = {
  enabled: true,
  onUpload: async (file: NativeFileInput) => ({
    type: "data" as const,
    value: await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    }),
    mimeType: file.mimeType,
  }),
};

function Composer() {
  const { attachments, openPicker, removeAttachment, submitMessage, isRunning } =
    useCopilotChatContext();
  const [text, setText] = useState("");

  return (
    <View style={{ padding: 8, gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {attachments.map((attachment) => (
          <Pressable key={attachment.id} onPress={() => removeAttachment(attachment.id)}>
            {attachment.type === "image" && attachment.source.type === "data" ? (
              <Image
                source={{ uri: `data:${attachment.source.mimeType};base64,${attachment.source.value}` }}
                style={{ width: 48, height: 48, borderRadius: 8 }}
              />
            ) : (
              <Text>{attachment.status === "uploading" ? "Uploading..." : attachment.filename}</Text>
            )}
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={openPicker}>
          <Text>Attach</Text>
        </Pressable>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 }}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
        />
        <Pressable
          disabled={isRunning}
          onPress={() => {
            void submitMessage(text);
            setText("");
          }}
        >
          <Text>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

// HARNESS: page assumes your existing chat's message list (rows copied from the Headless UI page's ChatScreen)
function MessageList() {
  const { agent } = useAgent({ agentId: "default" });
  const rows = agent.messages.filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content,
  );
  return (
    <FlatList
      data={rows}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      renderItem={({ item }) => (
        <View
          style={{
            alignSelf: item.role === "user" ? "flex-end" : "flex-start",
            backgroundColor: item.role === "user" ? "#4f46e5" : "#f1f1f4",
            borderRadius: 16,
            padding: 12,
            maxWidth: "80%",
          }}
        >
          <Text style={{ color: item.role === "user" ? "#fff" : "#111" }}>{item.content as string}</Text>
        </View>
      )}
    />
  );
}

export function ChatScreen() {
  // Doc callout: "Pass this object as the attachments prop in the samples below"
  return (
    <CopilotChat agentId="default" attachments={attachments}>
      {/* Your message list goes here. */}
      {/* HARNESS: page assumes your existing chat's message list */}
      <MessageList />
      <Composer />
    </CopilotChat>
  );
}
