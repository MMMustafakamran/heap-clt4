# Group A (chat/UI): claude-sdk-typescript RN

Diff method: live `.md` of `/react-native/claude-sdk-typescript/<page>` vs `/react-native/google-antigravity/<page>`, slug replaced.
Backend: `backend/rn_chat_main.py` (:8184), one POST route per page, each serving `backend/agents/<id_with_underscores>.py`
= the quickstart `main.py` ClaudeAgentAdapter, every line `# HARNESS` (no group-A page shows a Claude agent).
Runtimes: `pages/<id>/runtime.ts` -> `HttpAgent http://localhost:8184/<id>` (comments changed from "Antigravity" to Claude).

| Page | Diff vs antigravity | Files | Expected finding | Probe prompt |
|---|---|---|---|---|
| prebuilt-components | identical | frontend unchanged (already verbatim); agents/prebuilt_components.py | L4/3: native peers of `/components` (bottom-sheet, gesture-handler, reanimated, streamdown) only pointed at, not installed (same as sister) | "Say hello in one sentence" |
| markdown | identical | unchanged; agents/markdown.py | same peers note (L3/4) | "Reply with a bold word, a bullet list and a code block" |
| headless-ui | identical | unchanged; agents/headless_ui.py | L4: no App/provider shown (harness wrapper) | tap "Plan my day" suggestion, or "What can you do?" |
| multimodal-attachments | identical | unchanged; agents/multimodal_attachments.py | keep sister's result (sister ❌: no message list); Expo-only install in bare CLI app | attach a file + "What is in this file?" |
| programmatic-control | **differs**: antigravity has install step + `_common.py`/agent code; claude page has a Step "Run Claude through an AG-UI endpoint ... Wrap Claude Agent SDK once" with **no code at all** | NEW `pages/programmatic-control/{App.tsx,runtime.ts,src/AgentTrigger.tsx,src/useMeetingRequest.ts}`; agents/programmatic_control.py | L3 (maybe L1 if RN quickstart stays Claude-less): backend step names a wrapper but shows none, so the reader must reuse the web quickstart's main.py. Minor: subscribe excerpt uses undefined `setStatus`; nothing renders `request` | tap "Run agent" (fixed prompt "Summarize the latest sales data"); then via default agent ask to schedule a meeting is not possible from this page (no chat), so check status text + reply under buttons |
| inspector | identical | unchanged (BuiltInAgent runtime, doc-only page) | N/A: "no React Native build of Inspector" banner | none |
| webmcp | identical | unchanged (doc-only) | N/A: no-op on RN | none |
| generative-ui | identical (overview, no code) | none (no route needed) | N/A overview, no row/clip like sister | none |

HARNESS in programmatic-control/App.tsx: provider + runtimeUrl, `RunStatus` wrapper for the subscribe excerpt, `MeetingRequestButtons` view for `request`/`answer`. `// [!code highlight]` doc markers dropped.

Registry: NOT edited (registry.ts/runtimes.ts header says main session owns them). Add:
- registry.ts: `import ProgrammaticControlPage from "./programmatic-control/App";` + `"programmatic-control": ProgrammaticControlPage,`
- runtimes.ts: `import ProgrammaticControlRuntime from "./programmatic-control/runtime";` + `"programmatic-control": ProgrammaticControlRuntime,`
