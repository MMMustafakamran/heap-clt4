// Doc: https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/tool-rendering
// Verbatim: weather-tool-backend.ts and the two claude-agent-sdk-adapter.ts excerpts. HARNESS lines fill what they use but never define.
import type Anthropic from "@anthropic-ai/sdk";
import { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk"; // HARNESS: import never shown
import { tool as sdkTool, createSdkMcpServer, type McpServerConfig } from "@anthropic-ai/claude-agent-sdk"; // HARNESS: import never shown
import { type Emit, type ExecuteTool, normalizeClaudeAgentSdkModel, zodShapeFromJsonSchema } from "./_genui-harness.js"; // HARNESS: helpers never defined on the page

// --- src/app/demos/tool-rendering/weather-tool-backend.ts (verbatim) ---
export const GET_WEATHER_TOOL: Anthropic.Tool = {
  name: "get_weather",
  description:
    "Get the current weather for a given location. Useful on its own for " +
    "weather questions, and a great companion to `search_flights`.",
  input_schema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The city or region to get weather for.",
      },
    },
    required: ["location"],
  },
};

export function getWeather(location: string): Record<string, unknown> {
  return {
    city: location,
    temperature: 68,
    humidity: 55,
    wind_speed: 10,
    conditions: "Sunny",
  };
}

// --- claude-agent-sdk-adapter.ts, Step 1 (verbatim) ---
export function createClaudeAgentAdapter({ // HARNESS: export added so the server can call it
  toolSchemas,
  emit,
  getState,
  setState,
  executeTool,
  model,
  systemPrompt,
}: {
  toolSchemas: Anthropic.Tool[];
  emit: Emit;
  getState: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  executeTool: ExecuteTool;
  model: string;
  systemPrompt: string;
}) {
  const backendToolServer = buildBackendToolServer({
    toolSchemas,
    emit,
    getState,
    setState,
    executeTool,
  });

  return new ClaudeAgentAdapter({
    agentId: "claude-sdk-typescript",
    model: normalizeClaudeAgentSdkModel(model),
    systemPrompt,
    tools: [],
    mcpServers: backendToolServer.mcpServers,
    allowedTools: backendToolServer.allowedTools,
    permissionMode: "dontAsk",
    maxTurns: 10,
  });
}

// --- claude-agent-sdk-adapter.ts, Step 2 (verbatim) ---
const COPILOTKIT_MCP_SERVER_NAME = "copilotkit";
const COPILOTKIT_TOOL_PREFIX = `mcp__${COPILOTKIT_MCP_SERVER_NAME}__`;

function buildBackendToolServer({
  toolSchemas,
  emit,
  getState,
  setState,
  executeTool,
}: {
  toolSchemas: Anthropic.Tool[];
  emit: Emit;
  getState: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  executeTool: ExecuteTool;
}): {
  mcpServers?: Record<string, McpServerConfig>;
  allowedTools: string[];
} {
  if (toolSchemas.length === 0) {
    return { allowedTools: [] };
  }

  const tools = toolSchemas.map((schema) =>
    sdkTool(
      schema.name,
      schema.description ?? "",
      zodShapeFromJsonSchema(schema.input_schema),
      async (args) => {
        try {
          const result = await executeTool(
            schema.name,
            args as Record<string, unknown>,
            getState(),
            emit,
          );
          if (result.state) {
            setState(result.state);
          }
          return {
            content: [{ type: "text" as const, text: result.resultText }],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      },
    ),
  );

  return {
    mcpServers: {
      [COPILOTKIT_MCP_SERVER_NAME]: createSdkMcpServer({
        name: COPILOTKIT_MCP_SERVER_NAME,
        version: "1.0.0",
        tools,
      }),
    },
    allowedTools: toolSchemas.map(
      (schema) => `${COPILOTKIT_TOOL_PREFIX}${schema.name}`,
    ),
  };
}

// HARNESS: the page never shows the executeTool that runs get_weather, nor the route; tester-written.
export const executeWeatherTool: ExecuteTool = async (toolName, toolInput) => ({
  resultText: JSON.stringify(getWeather(String(toolInput.location ?? ""))),
});
