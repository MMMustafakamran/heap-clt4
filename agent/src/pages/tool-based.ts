// Doc: https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/tool-based
// The page's only backend block (agent_server.ts, buildTools) is copied verbatim below. The page says the
// published ClaudeAgentAdapter does this conversion for you, so rn-genui.ts serves this page with the
// quickstart adapter (agent/src/agent-server.ts), which forwards the app's frontend tools itself.
import type Anthropic from "@anthropic-ai/sdk"; // HARNESS: import the excerpt needs, never shown
import type { RunAgentInput } from "@ag-ui/core"; // HARNESS: import the excerpt needs, never shown

// HARNESS: export so the server file can reference it (the excerpt is a bare function)
export function buildTools(tools: RunAgentInput["tools"]): Anthropic.Tool[] {
  if (!tools || tools.length === 0) return [];

  return tools.map((tool) => {
    let inputSchema: Anthropic.Tool.InputSchema = {
      type: "object",
      properties: {},
    };
    if (tool.parameters) {
      try {
        const parsed =
          typeof tool.parameters === "string"
            ? JSON.parse(tool.parameters)
            : tool.parameters;
        inputSchema = parsed as Anthropic.Tool.InputSchema;
      } catch (parseErr) {
        // Don't silently swap in an empty schema — Claude will then accept
        // any input shape, which compounds whatever caller bug produced
        // the malformed JSON. Warn loudly so the tool definition gets
        // fixed instead of being papered over.
        const message =
          parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.warn(
          `[agent_server] failed to parse tool.parameters for ${tool.name}; using empty schema. error=${message}`,
        );
      }
    }
    return {
      name: tool.name,
      description: tool.description ?? "",
      input_schema: inputSchema,
    };
  });
}
