// Sub-Agents (/react-native/claude-sdk-typescript/multi-agent/subagents). The page shows the supervisor tool
// schemas and the sub-agent prompts (src/agent/subagents-prompts.ts) only. HARNESS: the run loop that "runs
// the matching sub-agent synchronously, records the delegation into shared agent state" is never shown
// (FINDINGS: subagents, level 1); filled in with shared-state.ts's harness loop + one Messages API call per
// delegation, entries merged by a stable id as the page's callout asks.
import type { Express } from "express"; // HARNESS
import Anthropic from "@anthropic-ai/sdk"; // HARNESS
import { randomUUID } from "node:crypto"; // HARNESS
import { CLAUDE_MODEL, EXTRA_BACKEND_TOOLS, runAgenticLoop } from "./shared-state.js"; // HARNESS

// DOC: src/agent/subagents-prompts.ts (sub-agent prompts)
// Each sub-agent is defined by its own system prompt. The supervisor
// invokes them as tools; on each call the agent server issues a single
// Anthropic Messages API request with the matching prompt below. They
// don't share memory or tools with the supervisor — the supervisor only
// ever sees what the sub-agent returns as a tool result.
export const RESEARCH_SUBAGENT_SYSTEM =
  "You are a research sub-agent. Given a topic, produce a concise " +
  "bulleted list of 3-5 key facts. No preamble, no closing.";

export const WRITING_SUBAGENT_SYSTEM =
  "You are a writing sub-agent. Given a brief and optional source facts, " +
  "produce a polished 1-paragraph draft. Be clear and concrete. No preamble.";

export const CRITIQUE_SUBAGENT_SYSTEM =
  "You are an editorial critique sub-agent. Given a draft, give 2-3 crisp, " +
  "actionable critiques. No preamble.";

export const SUPERVISOR_SYSTEM_PROMPT =
  "You are a supervisor agent that coordinates three specialized " +
  "sub-agents to produce high-quality deliverables.\n\n" +
  "Available sub-agents (call them as tools):\n" +
  "  - research_agent: gathers facts on a topic.\n" +
  "  - writing_agent: turns facts + a brief into a polished draft.\n" +
  "  - critique_agent: reviews a draft and suggests improvements.\n\n" +
  "For most non-trivial user requests, delegate in sequence: research -> " +
  "write -> critique. Pass the relevant facts/draft through the `task` " +
  "argument of each tool. Each tool returns a JSON object shaped " +
  "`{status: 'completed' | 'failed', result?: string, error?: string}`. " +
  "If a sub-agent fails, surface the failure briefly to the user (don't " +
  "fabricate a result) and decide whether to retry. Keep your own " +
  "messages short — explain the plan once, delegate, then return a " +
  "concise summary once done. The UI shows the user a live log of " +
  "every sub-agent delegation, including the in-flight 'running' state.";

export type SubAgentName =
  | "research_agent"
  | "writing_agent"
  | "critique_agent";

export const SUBAGENT_SYSTEM_BY_NAME: Record<SubAgentName, string> = {
  research_agent: RESEARCH_SUBAGENT_SYSTEM,
  writing_agent: WRITING_SUBAGENT_SYSTEM,
  critique_agent: CRITIQUE_SUBAGENT_SYSTEM,
};
// END DOC

// DOC: subagents-prompts.ts (supervisor tool schemas; shown twice on the page, same text)
// The supervisor delegates by calling tools. Each entry below is an
// Anthropic tool schema that the supervisor LLM "calls" to delegate
// work; the run loop in `agent_server.ts` runs the matching sub-agent
// synchronously, records the delegation into shared agent state, and
// returns the sub-agent's output as a tool_result the supervisor can
// read on its next step.
export const SUBAGENT_TOOL_SCHEMAS = [
  {
    name: "research_agent" as const,
    description:
      "Delegate a research task to the research sub-agent. Use for: " +
      "gathering facts, background, definitions, statistics. Returns a " +
      "JSON object {status, result?, error?}.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string",
          description: "The research task — a topic or question.",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "writing_agent" as const,
    description:
      "Delegate a drafting task to the writing sub-agent. Use for: " +
      "producing a polished paragraph, draft, or summary. Pass relevant " +
      "facts from prior research inside `task`. Same return shape.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string",
          description:
            "The drafting brief — include any facts the writer should use.",
        },
      },
      required: ["task"],
    },
  },
  {
    name: "critique_agent" as const,
    description:
      "Delegate a critique task to the critique sub-agent. Use for: " +
      "reviewing a draft and suggesting concrete improvements. Same " +
      "return shape.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: {
          type: "string",
          description: "The draft to critique.",
        },
      },
      required: ["task"],
    },
  },
];
// END DOC

const anthropic = new Anthropic(); // HARNESS: reads ANTHROPIC_API_KEY

// HARNESS: the sub-agent call and the delegations write are described in prose only
for (const schema of SUBAGENT_TOOL_SCHEMAS) {
  EXTRA_BACKEND_TOOLS[schema.name] = async (toolName, toolInput, state) => {
    const task = String(toolInput.task ?? "");
    const id = randomUUID();
    const delegations = Array.isArray(state.delegations) ? (state.delegations as any[]) : [];
    try {
      const msg = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: SUBAGENT_SYSTEM_BY_NAME[toolName as SubAgentName],
        messages: [{ role: "user", content: task }],
      });
      const result = msg.content.map((b: any) => (b.type === "text" ? b.text : "")).join("");
      return {
        resultText: JSON.stringify({ status: "completed", result }),
        state: { ...state, delegations: [...delegations, { id, sub_agent: toolName, task, status: "completed", result }] },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        resultText: JSON.stringify({ status: "failed", error: message }),
        state: { ...state, delegations: [...delegations, { id, sub_agent: toolName, task, status: "failed", result: message }] },
      };
    }
  };
}

export function registerSubagents(app: Express) { // HARNESS
  app.post("/subagents", async (req, res) => {
    const incoming = ((req.body?.state ?? {}) as Record<string, unknown>);
    const delegations = Array.isArray(incoming.delegations) ? incoming.delegations : [];
    await runAgenticLoop(req, res, {
      systemPrompt: SUPERVISOR_SYSTEM_PROMPT,
      toolSchemas: SUBAGENT_TOOL_SCHEMAS as Anthropic.Tool[],
      initialState: { delegations },
    });
  });
}
