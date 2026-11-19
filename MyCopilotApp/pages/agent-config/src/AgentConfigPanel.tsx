// HARNESS: the Agent Config page has NO React Native frontend code. Its prose says the UI "owns a typed config
// object" and "most agents read the config from the context that the UI publishes with useAgentContext"
// (the Built-in Agent uses the web <CopilotKit properties> instead). This panel is the tester's guess:
// three button rows for the doc's Tone / Expertise / ResponseLength values, published with useAgentContext.
import { useState } from "react";
import { Button, Text, View } from "react-native";
import { useAgentContext } from "@copilotkit/react-native/headless";

const TONES = ["professional", "casual", "enthusiastic"] as const;
const EXPERTISE = ["beginner", "intermediate", "expert"] as const;
const LENGTHS = ["concise", "detailed"] as const;

export function AgentConfigPanel() {
  const [tone, setTone] = useState<string>("professional");
  const [expertise, setExpertise] = useState<string>("intermediate");
  const [responseLength, setResponseLength] = useState<string>("concise");

  useAgentContext({
    description: "Agent config (tone, expertise, responseLength)",
    value: { tone, expertise, responseLength },
  });

  const row = (label: string, values: readonly string[], current: string, set: (v: string) => void) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      <Text>{label}:</Text>
      {values.map((v) => (
        <Button key={v} title={v === current ? `[${v}]` : v} onPress={() => set(v)} />
      ))}
    </View>
  );

  return (
    <View style={{ padding: 8, gap: 6 }}>
      {row("Tone", TONES, tone, setTone)}
      {row("Expertise", EXPERTISE, expertise, setExpertise)}
      {row("Length", LENGTHS, responseLength, setResponseLength)}
    </View>
  );
}
