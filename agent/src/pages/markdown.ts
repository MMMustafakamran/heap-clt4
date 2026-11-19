// HARNESS: the markdown page shows no agent code (frontend-only page, it uses the "default" agent).
// This is the ClaudeAgentAdapter from /claude-sdk-typescript/quickstart agent-server.ts, verbatim.
import { ClaudeAgentAdapter } from "@ag-ui/claude-agent-sdk"; // HARNESS: quickstart agent

export const agent = new ClaudeAgentAdapter({ // HARNESS: quickstart agent
  agentId: "claude-sdk-typescript",
  model: process.env.CLAUDE_MODEL ?? "claude-opus-4-8",
  systemPrompt: "You are a helpful assistant embedded in a CopilotKit app.",
  tools: [],
  permissionMode: "dontAsk",
  maxTurns: 10,
});
