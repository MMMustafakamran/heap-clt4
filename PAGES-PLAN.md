# Claude Agent SDK (TypeScript) + React Native: page plan (research 2026-11-19)

Docs root: https://docs.copilotkit.ai/react-native/claude-sdk-typescript (append `.md` for the export).

Method: the rendered nav is built client-side (the server HTML holds only about 10 section links), so the sidebar was taken from the sister snapshot `1-frameworks/antigravity/react-native/doc-snapshot/sidebar.json` (same RN section template). Every slug was then fetched under `claude-sdk-typescript`, and all returned 200. **Check it in a headless browser (expand the groups) before running `drift.mjs --sync-nav`.** (Python research; the TS pages fence agent code as typescript.)

## 1. Page list (in scope)

| # | id (antigravity RN id to copy) | Title | docPath | Group | reachable |
|---|---|---|---|---|---|
| 1 | quickstart | React Native (Quickstart) | (root) | top | sidebar |
| 2 | prebuilt-components | Prebuilt Components | prebuilt-components | Basics > Chat | sidebar |
| 3 | markdown | Markdown Rendering | custom-look-and-feel/markdown | Basics > Chat | sidebar |
| 4 | headless-ui | Headless UI | custom-look-and-feel/headless-ui | Basics > Chat | sidebar |
| 5 | multimodal-attachments | Multimodal Attachments | multimodal-attachments | Basics > Chat | sidebar |
| 6 | frontend-tools | Frontend Tools | frontend-tools | Basics > Chat | sidebar |
| 7 | generative-ui | Generative UI (overview) | generative-ui | Generative UI | sidebar |
| 8 | tool-based | Components as Tools | generative-ui/tool-based | Generative UI | sidebar |
| 9 | tool-rendering | Tool Call Rendering | generative-ui/tool-rendering | Generative UI | sidebar |
| 10 | shared-state | Shared State | shared-state | Interactivity > Shared state | sidebar |
| 11 | shared-state-rendering | Render agent state in your app | shared-state/rendering-in-app | Interactivity > Shared state | sidebar |
| 12 | agent-readonly | Agent Read-Only Context | shared-state/agent-readonly | Interactivity > Shared state | sidebar |
| 13 | hitl | HITL Overview | human-in-the-loop | Interactivity > HITL | sidebar |
| 14 | use-interrupt | Pausing the Agent for Input | human-in-the-loop/useInterrupt | Interactivity > HITL | sidebar |
| 15 | hitl-headless | Headless Interrupts | human-in-the-loop/headless | Interactivity > HITL | sidebar |
| 16 | governed-actions | Governed Action Approval UI | human-in-the-loop/governed-actions | Interactivity > HITL | sidebar |
| 17 | webmcp | WebMCP | webmcp | Interactivity > HITL | sidebar |
| 18 | subagents | Sub-Agents | multi-agent/subagents | Agent capabilities | sidebar |
| 19 | inspector | Inspector | inspector | Backend > Debugging (not a backend/* path) | sidebar (also linked from quickstart) |
| 20 | state-rendering (NEW, copy shared-state-rendering) | State Rendering | generative-ui/state-rendering | - | in-content (from generative-ui) |
| 21 | state-streaming (NEW, copy shared-state) | State Streaming | shared-state/streaming | - | in-content (from shared-state, rendering-in-app, agent-readonly, subagents) |
| 22 | programmatic-control (NEW, copy hitl-headless) | Programmatic Control | programmatic-control | - | in-content (from headless-ui, shared-state) |
| 23 | agent-config (NEW, copy shared-state) | Agent Config | agent-config | - | in-content (from inspector) |

- **Doc-only, nothing to run** (N/A row or a note, as in the sister repo): generative-ui, webmcp, inspector.
- **In the sidebar but not feature pages** (the sister repo does not track them): build-with-agents (MCP and skills setup), telemetry, community-frameworks, vs-code-extension (it links troubleshooting/event-inspector), cli (linked from quickstart). Proposal: skip them as tooling pages; the owner confirms.
- **Excluded:** intelligence/*, backend/* (copilot-runtime), and learning and threads-import. Those two are Intelligence platform features linked from inspector and cli, so they count as Intelligence scope.

## 2. Per page

Common frontend: `@copilotkit/react-native` (`/headless`, `/components`). The runtime is a Node `server.ts` (`CopilotRuntime` + `createCopilotNodeListener`) on port 8200 in the doc; change the port and mark it HARNESS.

All backend snippets are Python excerpts from CopilotKit's showcase "Claude Agent SDK demo". They call the **Anthropic Messages API directly** (`anthropic.AsyncAnthropic`), not `ClaudeAgentAdapter`. None of them shows a full server, a `pip install` step, or how to register the agent in the runtime.

- **quickstart**
  - Install: `npx @react-native-community/cli@latest init MyCopilotApp`; npm/pnpm/yarn tabs with `npm install @copilotkit/react-native @copilotkit/runtime "zod@^3.25"` and `-D tsx typescript @types/node`; `npm install react-native-get-random-values`.
  - Code: index.js (polyfills); server.ts (`BuiltInAgent` with model `"openai:gpt-6-luna"`, PORT 8200); App.tsx; src/ChatScreen.tsx; metro.config.js; Expo app.json; the generative UI catalog blocks (bankUI, agentTurns, HomeScreen, GenerativeUISurface).
  - Run: `npx react-native run-ios|run-android`, `npx copilotkit verify --round-trip`.
  - Env: OPENAI_API_KEY (ANTHROPIC_API_KEY and GOOGLE_API_KEY are only mentioned).
  - Banners: publicApiKey/licenseToken are not supported on RN; Inspector has no RN surface; generative UI has no markdown transport and no openUrl.
  - **Agent: no Claude SDK TypeScript agent at all** (only the OpenAI BuiltInAgent). The antigravity RN quickstart has the same gap and is ❌.
- **prebuilt-components**: App.tsx, `<CopilotChat`, App.tsx (useRef), src/AssistantPopup.tsx. The page never installs the native peers that `/components` needs (@gorhom/bottom-sheet, gesture-handler, reanimated, react-native-streamdown). Agent: the default one.
- **markdown**: src/AssistantBubble.tsx and `AssistantMessage` from `/components`. Same native-peers gap.
- **headless-ui**: src/ChatScreen.tsx and `useConfigureSuggestions({`. Agent: the default one.
- **multimodal-attachments**: `npx expo install expo-document-picker expo-file-system` (Expo only, while the quickstart builds a bare CLI app); `expo-file-system/legacy`; src/ChatScreen.tsx; `<CopilotChat` twice; Alert; `useAttachments` from the root barrel. No backend shown. The sister page is ❌ (no message list).
- **frontend-tools**: `npm install zod`; src/TaskScreen.tsx, App.tsx, `useFrontendTool(`. The Python `agent.py` is only the helper `_build_frontend_tools(input_data: RunAgentInput)`. The prose says the published `ClaudeAgentAdapter` from `ag_ui_claude_sdk` needs no conversion. Missing: the agent loop, the imports and the server.
- **generative-ui**: overview with no code. Links to state-rendering, tool-based, tool-rendering and HITL.
- **tool-based**: src/BarChart.tsx, src/ChatScreen.tsx (`useComponent`), `useRenderToolCall`. The Python `agent.py` is the same `_build_frontend_tools` helper. `npm install zod`.
- **tool-rendering**: src/ToolCallCard.tsx, src/WeatherCard.tsx; Python `src/app/demos/tool-rendering/weather_tool.py` (`get_weather`) and two excerpts of `claude_agent_sdk_adapter.py`. Likely missing pieces, since the adapter is only excerpted. The sister page is ❌.
- **shared-state**: src/NotesCard.tsx, Button, `useCopilotKit`. Python: three excerpts of `shared_state_read_write_agent.py` (they use `normalize_claude_model` and `DEFAULT_ANTHROPIC_MODEL`, never defined, and env ANTHROPIC_MODEL), plus `agent_server.py` and `state_streaming_backend.py` (ag_ui.core, ag_ui.encoder).
- **shared-state-rendering**: src/TaskBoard.tsx and App.tsx. No Python agent on the page.
- **agent-readonly**: src/ProfileScreen.tsx and a Python `agent.py` excerpt.
- **hitl**: src/MeetingApproval.tsx, plus a `typescript` block titled `page.tsx - useHumanInTheLoop`, which looks like a web excerpt on an RN page. No Python agent.
- **use-interrupt**: src/MeetingChat.tsx; Python `src/agents/interrupt_agent.py` (only SYSTEM_PROMPT with `dedent`); text `outcome.type === "interrupt"`; tsx approve/cancel render, the multi-interrupt example, App.tsx. Check the rendered page for a "not available" callout (the sister page had one).
- **hitl-headless**: src/MeetingRequestPanel.tsx and App.tsx. App.tsx imports `./src/ChatScreen`, which this page never shows.
- **governed-actions**: ts `type GovernedAction`; src/GovernedActionCard.tsx, src/GovernedActionApproval.tsx, src/GovernedActionTool.tsx. The Python `agent.py` is **LangGraph** (`from langchain_core.tools import tool`, `from langgraph.types import interrupt`).
- **webmcp**: webmcp.ts (`CopilotKitCore` from @copilotkit/core). The page says it is a no-op on RN (the sister page is N/A).
- **subagents**: Python `src/agents/subagents_agent.py` (`_delegation_tool_schema`, `_invoke_sub_agent`, `anthropic.AsyncAnthropic`, `normalize_claude_model`; ANTHROPIC_SUBAGENT_MODEL and DEFAULT_ANTHROPIC_MODEL are never defined). **No frontend code.**
- **inspector**: a js cookie reset and a web `<CopilotKit` tsx block. Banner: "There is no React Native build of Inspector". Env: CPK_*.
- **state-rendering** (in-content): Python `shared_state_read_write_agent.py` three times and `agent_server.py`; src/ResearchProgress.tsx and App.tsx.
- **state-streaming** (in-content): banner **"Not available on this framework yet. This framework's showcase doesn't support state streaming"**, but the page still shows Python `agent.py`, `state_streaming_backend.py` and src/DocumentView.tsx. The row follows the banner (N/A) unless the probe works.
- **programmatic-control** (in-content): src/AgentTrigger.tsx, two tsx excerpts, src/useMeetingRequest.ts. Agent: the default one, or any.
- **agent-config** (in-content): Python `agent_config_agent.py` (Tone/Expertise Literals) and a text "Backend flow" block. The prose mentions `useAgentContext` and the web `<CopilotKit properties>`, but there is **no RN frontend code**.

## 3. Suspected findings (QA-RULES §3/§8a, to confirm by probe)

1. The quickstart has no Claude Agent SDK TypeScript backend at all. It registers only BuiltInAgent `openai:gpt-6-luna`. There is no `pip install` for ag-ui-claude-sdk or claude-agent-sdk, no adapter and no runtime registration (HttpAgent). Level 1, and likely `quickstartBlocked`, as in antigravity RN.
2. Every Python snippet is a showcase excerpt that calls the raw Anthropic Messages API. Each uses pieces it never defines (`normalize_claude_model`, `DEFAULT_ANTHROPIC_MODEL`, the `RunAgentInput` import, the server app), and none has an install step. The prose names `ClaudeAgentAdapter` as the published path but never shows it. Affected: frontend-tools, tool-based, tool-rendering, shared-state, subagents, agent-config.
3. governed-actions: the agent code is LangGraph, the wrong framework (the sister page is ❌ for the same reason).
4. subagents: no frontend code for the delegation UI, and undefined helpers.
5. state-streaming: a "Not available on this framework yet" banner while the page still shows code.
6. hitl: a web `page.tsx` TypeScript excerpt on an RN page. use-interrupt: the backend is only a SYSTEM_PROMPT.
7. agent-config: no RN frontend; it refers to the web `<CopilotKit properties>`.
8. prebuilt-components and markdown never install the native peers `/components` needs (a minor note in the sister repo). multimodal-attachments uses an Expo-only install in a bare CLI app.
9. hitl-headless imports `./src/ChatScreen`, which the page never shows (minor).

## 4. Build groups (3 parallel agents, after the quickstart base runs)

The base comes first, built by the owning agent: the quickstart, the Node runtime and a Python Claude backend (HARNESS: `ag_ui_claude_sdk` ClaudeAgentAdapter on FastAPI, registered as an HttpAgent), plus the ports.

| Group | Pages | Antigravity RN ids to copy |
|---|---|---|
| A. Chat / UI (mostly frontend, default agent) | prebuilt-components, markdown, headless-ui, multimodal-attachments, programmatic-control, inspector, webmcp, generative-ui | same ids; programmatic-control from hitl-headless |
| B. GenUI / tools | frontend-tools, tool-based, tool-rendering, state-rendering, hitl, use-interrupt | same ids; state-rendering from shared-state-rendering |
| C. State / advanced HITL / multi-agent | shared-state, shared-state-rendering, agent-readonly, state-streaming, agent-config, governed-actions, hitl-headless, subagents | same ids; state-streaming and agent-config from shared-state |

Sister harness: `1-frameworks/antigravity/react-native/MyCopilotApp/pages/<id>` (plus registry.ts and runtimes.ts). Its assignment.json statuses are quoted in sections 2 and 3.
