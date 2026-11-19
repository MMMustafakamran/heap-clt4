# FINDINGS: Claude Agent SDK (TypeScript), React Native

Open doc defects on the React Native section of the Claude Agent SDK (TypeScript) docs (Android emulator; iOS not testable on Windows). Probe: CI run 44622497317 (2026-11-19).

Stack: @copilotkit/react-native 1.89.0 (declared ^1.89.0), @copilotkit/runtime 1.89.0 (^1.89.0), react-native 0.88.1, zod ^3.25.76, react-native-get-random-values ^2.1.0, react-native-streamdown ^0.3.0, react-native-worklets ^0.13.1, react-native-reanimated ^4.7.2, expo-file-system ~58.0.14 · agent (agent/package-lock.json): @ag-ui/claude-agent-sdk 0.0.9, @anthropic-ai/claude-agent-sdk 0.3.306, @anthropic-ai/sdk 1.11, express 5.3, tsx 4.23 · Node 26.7.0, npm 11 · Windows 11 Pro, Android emulator API 36 x86_64 · docs https://docs.copilotkit.ai/react-native/claude-sdk-typescript, snapshot 2026-11-19

### [React Native (Quickstart)](https://docs.copilotkit.ai/react-native/claude-sdk-typescript)

**Dev blockers**

**#1 The Claude Agent SDK quickstart never connects a Claude agent.** The page sits under Claude Agent SDK (TypeScript), but its only runtime registers a built-in OpenAI agent; there is no install of `@ag-ui/claude-agent-sdk`, no agent server and no runtime registration.
- **Doc:** `default: new BuiltInAgent({ model: "openai:gpt-6-luna", ... })` in `server.ts`; env step names `OPENAI_API_KEY`.
- **Result:** a chat on OpenAI, not on Claude. To use Claude a reader has to find the backend elsewhere (`ClaudeAgentAdapter` on express, from the web TS quickstart) and the runtime wiring (`HttpAgent` from `@ag-ui/client`, a package no install step names).
- **Confirmed by harness:** every other page runs on `HttpAgent({ url: "http://localhost:817x/<page>" })` in a HARNESS runtime (`MyCopilotApp/pages/<id>/runtime.ts`) plus `agent/src/rn-*.ts`; the quickstart agent is the web TS quickstart's `src/agent-server.ts`, verbatim (`agent/`).

**Minor notes**
- #2 `App.tsx` has no safe area: the first chat message renders under the Android status bar (same template as the Antigravity RN page).
- #21 The TS quickstart's install command fails: `npm install @anthropic-ai/claude-agent-sdk@^0.2.58 ... @ag-ui/claude-agent-sdk` → `ERESOLVE` (`@ag-ui/claude-agent-sdk` 0.0.9 peers `@anthropic-ai/claude-agent-sdk` 0.3.306). Harness installs 0.3.306.

### [Prebuilt Components](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/prebuilt-components)

**Minor notes**
- #3 The `/components` chat needs `@gorhom/bottom-sheet`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-streamdown` (+ its peers `react-native-worklets`, `react-native-enriched-markdown`, `remend`); the page lists them in a table but gives no install command. Same gap on Markdown, Frontend Tools, Components as Tools, Tool Call Rendering, Render agent state.
- #4 `react-native-streamdown` needs its Worklets Bundle Mode setup (`babel.config.js` + `metro.config.js`); the page only says to follow the library's guide. Without it replies crash ("[Worklets] Tried to synchronously call a Remote Function", seen on the Antigravity RN harness).

### [Multimodal Attachments](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/multimodal-attachments)

**Dev blockers**

**#22 Tapping Send in the page's composer does nothing.** The page says to type a question and tap Send; the message should go out and the agent should answer.
- **Doc:** `Tap Attach, pick a photo, type a question, and tap Send.` with the composer's `<Pressable disabled={isRunning} onPress={() => { void submitMessage(text); setText(""); }}>`.
- **Result:** after tapping Send the prompt stays in the input, no user message, no reply, no error (2/2 probe runs).

**Minor notes**
- #5 The quick start leaves the message list as a placeholder (`{/* Your message list goes here. */}`, the page assumes your existing chat); the install step is Expo-only (`npx expo install expo-document-picker expo-file-system`) on a bare RN app. Harness adds the Headless UI page's message list.

### [Headless Interrupts](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/human-in-the-loop/headless)

**Minor notes**
- #13 `./src/ChatScreen` is imported but never shown.

### [Tool Call Rendering](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/tool-rendering)

**Minor notes**
- #8 The TS agent uses `normalizeClaudeAgentSdkModel`, `zodShapeFromJsonSchema`, `Emit`, `ExecuteTool` without defining or importing them, and shows no route; harness fills them (`_genui-harness.ts`), the weather card renders.

### [Shared State](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/shared-state)

**Dev blockers**

**#9 The TS agent is fragments of a loop the page never shows.** The route calls `runAgenticLoop`, which calls `runWithClaudeAgentSdk` and `executeBackendTool`; none of them is shown, and the "direct Anthropic Messages API fallback" the page names is never given.
- **Doc:** `await runAgenticLoop(req, res, {` in `agent_server.ts`; "Compatible requests use runWithClaudeAgentSdk. Requests with aimock content use the direct Anthropic Messages API fallback."
- **Result:** the page's code cannot run as published; a reader has to write the loop, runner and tool executor.
- **Confirmed by harness:** with `runAgenticLoop` / `runWithClaudeAgentSdk` / `executeBackendTool` written by hand (`agent/src/pages/shared-state.ts`, HARNESS) the notes card updates.

### [Sub-agents](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/multi-agent/subagents)

**Dev blockers**

**#16 No run loop and no React Native delegation log.** The page gives the supervisor prompt, sub-agent prompts and `SUBAGENT_TOOL_SCHEMAS`, but not the loop that calls the sub-agents and writes `delegations`, and the frontend section is one sentence with no code.
- **Doc:** "On the frontend, the delegation log is a reactive render of the delegations slot."
- **Result:** nothing to run and nothing to render; the reader has to write both sides.
- **Confirmed by harness:** with a hand-written sub-agent call + `delegations` write (`agent/src/pages/subagents.ts`) and a hand-written `DelegationLog` (`MyCopilotApp/pages/subagents/App.tsx`), the log shows 3 delegations.

### [State Rendering](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/generative-ui/state-rendering)

**Dev blockers**

**#17 The progress panel reads state the page's agent never writes.** `ResearchProgress` reads `status` / `draft` / `completed` / `total` from agent `researcher`; the TS backend on the page is the shared-state notes agent (`set_notes`, `notes`/`preferences`) on `agentId: "claude-sdk-typescript"`, and `runAgenticLoop` is again never shown.
- **Doc:** `agentId: "researcher",` in the panel; the agent's only tool is `set_notes`.
- **Result:** the agent answers in chat, the panel stays `Idle` / `0 of ? complete`.

### [State Streaming](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/shared-state/streaming)

**Dev blockers**

**#18 Only one branch of the streaming handler is shown.** The page shows the `if (activeToolCallName === "write_document")` branch and says it "runs inside the streamed tool-argument handler"; the handler, the route and the `write_document` tool are never shown, and a second helper `emitStreamingDocumentState` does the same job with no word on which to use.
- **Doc:** "This branch runs inside the streamed tool-argument handler."
- **Result:** the backend can't be built from the page.
- **Confirmed by harness:** with the handler, route and `write_document` executor written by hand (`agent/src/pages/state-streaming.ts`), the document streams.

### [Agent Config](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/agent-config)

**Dev blockers**

**#20 No React Native frontend, and three possible config channels.** The page has the TS prompt builder only; there is no RN code to set the config, and it names shared state, `useAgentContext` and `forwardedProps` as the way in.
- **Doc:** "The Claude Agent SDK demo reads configuration from shared state and folds it into the system prompt." vs "Most agents read the config from the context that the UI publishes with useAgentContext."
- **Result:** the reader has to guess the frontend and how the backend reads it.
- **Confirmed by harness:** a hand-written `AgentConfigPanel` + `latestValidConfig` (reads `useAgentContext`) make the tone change apply.

### [WebMCP](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/webmcp)

**Build-only**
- #15 The snippet calls `searchOrders(status)`, never defined (TS2304). The page itself says WebMCP is a no-op on React Native.

