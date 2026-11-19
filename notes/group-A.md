# Group A (chat) — Claude Agent SDK TypeScript × React Native

Diff: live `.md` of `/react-native/claude-sdk-typescript/<page>` vs `/react-native/claude-sdk-python/<page>` (2026-11-20).
All five pages differ **only in internal link slugs** (`claude-sdk-typescript` vs `claude-sdk-python`); every code block is identical, so the Python-harness frontends were kept as is.
No page shows any agent code. Backend: `agent/src/rn-chat.ts` (express, `POST /<id>`, `GET /health`, `AGENT_PORT` 8184) serving `agent/src/pages/<id>.ts`, each the quickstart `ClaudeAgentAdapter` verbatim, every line `// HARNESS` (page shows no agent, uses "default").
tsc (`--module nodenext`) on rn-chat.ts: clean. Runtimes (`MyCopilotApp/pages/<id>/runtime.ts`) already point at `http://localhost:8184/<id>`; unchanged.
Recorder: `agent/src/pages/<id>.ts` added to each page's `ideTabs`; no Python refs existed for these pages; `android.actions.ts` had no Python-only evidence for them.
Fix: stripped two `// [!code highlight]` markers in `headless-ui/src/ChatScreen.tsx` (JS-comment positions, not crash-causing, but not doc text).

| Page | TS vs Python | Files written | Expected status / finding | Probe prompt |
|---|---|---|---|---|
| prebuilt-components | links only | agent/src/pages/prebuilt-components.ts | ✅; L3 note: native peers of `/components` (bottom-sheet, gesture-handler, reanimated, streamdown) only pointed at, not installed | "Say hello in one sentence" |
| markdown | links only | agent/src/pages/markdown.ts | ✅; same peers note (L3) | "Reply with a bold word, a bullet list and a code block" |
| headless-ui | links only | agent/src/pages/headless-ui.ts | ✅; L4: no App/provider wrapper shown | "What can you do?" or tap a suggestion |
| multimodal-attachments | identical | agent/src/pages/multimodal-attachments.ts | follow sister/Python result (❌ there: root CopilotChat draws no message list); L3 note Expo-only install in bare CLI app | attach a file + "What is in this file?" |
| programmatic-control | links only (same "Wrap Claude Agent SDK once" step with no code, as Python) | agent/src/pages/programmatic-control.ts | ✅ + L3 note: backend step names a wrapper but shows none (reader reuses quickstart agent-server.ts); minor: subscribe excerpt uses undefined `setStatus` | tap "Run agent" (fixed prompt), check status + reply |

HARNESS lines: every line of `agent/src/pages/*.ts` and `agent/src/rn-chat.ts`; App.tsx wrappers inherited from the Python harness.
Not done (owner session): starting rn-chat (`npx tsx src/rn-chat.ts` with AGENT_PORT=8184), probes, registry/runtimes edits.
