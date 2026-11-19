# FINDINGS: Claude Agent SDK (TypeScript), React Native

Open doc defects on the React Native section of the Claude Agent SDK (TypeScript) docs (Android emulator; iOS not testable on Windows). **Draft 2026-11-20: quickstart and frontend findings carried over from the Python RN harness (same doc text); backend findings to be re-judged on each page's TypeScript agent code.**

Stack: @copilotkit/react-native 1.89.0 (declared ^1.89.0), @copilotkit/runtime 1.89.0 (^1.89.0), react-native 0.88.1, zod ^3.25.76, react-native-get-random-values ^2.1.0, react-native-streamdown ^0.3.0, react-native-worklets ^0.13.1, react-native-reanimated ^4.7.2, expo-file-system ~58.0.14 · agent (agent/package-lock.json): @ag-ui/claude-agent-sdk 0.0.9, @anthropic-ai/claude-agent-sdk 0.3.306, @anthropic-ai/sdk 1.11, express 5.3, tsx 4.23 · Node 26.7.0, npm 11 · Windows 11 Pro, Android emulator API 36 x86_64 · docs https://docs.copilotkit.ai/react-native/claude-sdk-typescript, snapshot 2026-11-19

### [React Native (Quickstart)](https://docs.copilotkit.ai/react-native/claude-sdk-typescript)

**Dev blockers**

**#1 The Claude Agent SDK quickstart never connects a Claude agent.** The page sits under Claude Agent SDK (TypeScript), but its only runtime registers a built-in OpenAI agent; there is no install of `@ag-ui/claude-agent-sdk`, no agent server and no runtime registration.
- **Doc:** `default: new BuiltInAgent({ model: "openai:gpt-6-luna", ... })` in `server.ts`; env step names `OPENAI_API_KEY`.
- **Result (expected, not probed):** a chat on OpenAI, not on Claude. To use Claude a reader has to find the backend elsewhere (`ClaudeAgentAdapter` on express, from the web TS quickstart) and the runtime wiring (`HttpAgent` from `@ag-ui/client`, a package no install step names).
- **Confirmed by harness:** every other page runs on `HttpAgent({ url: "http://localhost:817x/<page>" })` in a HARNESS runtime (`MyCopilotApp/pages/<id>/runtime.ts`) plus `agent/src/rn-*.ts`; the quickstart agent is the web TS quickstart's `src/agent-server.ts`, verbatim (`agent/`).

**Minor notes**
- #2 `App.tsx` has no safe area: the first chat message renders under the Android status bar (same template as the Antigravity RN page).
- #21 The TS quickstart's install command fails: `npm install @anthropic-ai/claude-agent-sdk@^0.2.58 ... @ag-ui/claude-agent-sdk` → `ERESOLVE` (`@ag-ui/claude-agent-sdk` 0.0.9 peers `@anthropic-ai/claude-agent-sdk` 0.3.306). Harness installs 0.3.306.

### [Prebuilt Components](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/prebuilt-components)

**Minor notes**
- #3 The `/components` chat needs `@gorhom/bottom-sheet`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-streamdown` (+ its peers `react-native-worklets`, `react-native-enriched-markdown`, `remend`); the page lists them in a table but gives no install command. Same gap on Markdown, Frontend Tools, Components as Tools, Tool Call Rendering, Render agent state.
- #4 `react-native-streamdown` needs its Worklets Bundle Mode setup (`babel.config.js` + `metro.config.js`); the page only says to follow the library's guide. Without it replies crash ("[Worklets] Tried to synchronously call a Remote Function", seen on the Antigravity RN harness).

### [Multimodal Attachments](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/multimodal-attachments)

**Minor notes**
- #5 The quick start leaves the message list as a placeholder (`{/* Your message list goes here. */}`, the page assumes your existing chat); the install step is Expo-only (`npx expo install expo-document-picker expo-file-system`) on a bare RN app. Harness adds the Headless UI page's message list.

### [Headless Interrupts](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/human-in-the-loop/headless)

**Minor notes**
- #13 `./src/ChatScreen` is imported but never shown.

### [WebMCP](https://docs.copilotkit.ai/react-native/claude-sdk-typescript/webmcp)

**Build-only**
- #15 The snippet calls `searchOrders(status)`, never defined (TS2304). The page itself says WebMCP is a no-op on React Native.

