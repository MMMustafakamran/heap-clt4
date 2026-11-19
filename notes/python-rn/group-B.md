# Group B (genUI / tools / HITL): Claude Agent SDK TypeScript x React Native

Backend: `backend/rn_genui_main.py` on :8185 (`cd backend && uv run uvicorn rn_genui_main:app --port 8185`), FastAPI on the quickstart main.py pattern. Agents in `backend/agents/{frontend_tools,tool_rendering,hitl,use_interrupt,state_rendering}.py`.
Checks: `py_compile` passes on every file. I could not run the import check: `uv run` hung on the cache lock (timeout 180 s), and `backend/.venv` has no `ag_ui` installed. **The owner session should run `uv sync` and then import `rn_genui_main`.**
Frontend: every page's tsx already matched this page's code verbatim, except `runtimeUrl`, which is a HARNESS change. I checked this line by line with a script. The runtime.ts comment and port of each page now point at :8185 (hitl and use-interrupt were on Antigravity's :8187). The new page `state-rendering` is registered in `pages/registry.ts` and `pages/runtimes.ts`.

## frontend-tools (sidebar)
- **Diff vs antigravity:** the frontend is identical. The agent step differs. Antigravity has "Nothing to wire" plus `gen_ui_tool_based.py`. Claude has "Forward browser tools to Claude", which is only the `_build_frontend_tools(input_data)` helper. It has no imports (`Any` and `RunAgentInput` are undefined), no agent loop, no server and no install step. The prose says the published `ClaudeAgentAdapter` needs no conversion, but the page never shows it.
- **Files:** `backend/agents/frontend_tools.py` (helper verbatim). Mounted at `/frontend-tools`.
- **HARNESS:** the `Any` and `RunAgentInput` imports, the `ClaudeAgentAdapter` import, and the quickstart adapter, which is the agent actually served. The helper is dead code.
- **Expected finding:** Level 1 unless the probe works. The backend is a fragment for a Messages API loop that is never shown, and the reader has to guess that the quickstart adapter is enough. If the adapter path works, it may drop to level 3 ("snippet is a showcase excerpt, quickstart adapter works"). Decide from the probe and the team doc.
- **Probe prompt:** "Show only the tasks that are done" (`filter_tasks`).

## tool-based (sidebar)
- **Diff vs antigravity:** the same as frontend-tools. It has the same `_build_frontend_tools` excerpt and identical frontend code (BarChart, ChatScreen `useComponent render_bar_chart`).
- **Files:** it reuses `agents/frontend_tools.py`, mounted at `/tool-based`.
- **HARNESS:** the same as frontend-tools. There is no system prompt telling Claude to call `render_bar_chart`. Antigravity had one; Claude gets only the quickstart prompt.
- **Expected finding:** Level 1, the same fragment gap. Also watch whether Claude calls the tool unprompted (Antigravity's page itself said "a model with no instruction will answer in prose").
- **Probe prompt:** "Show me a bar chart of quarterly sales: Q1 10, Q2 15, Q3 8, Q4 20".

## tool-rendering (sidebar)
- **Diff vs antigravity:** the frontend is identical (ToolCallCard `*`, WeatherCard `get_weather`). Antigravity has `TOOLS=[...]` plus `build`. Claude has two excerpts of `claude_agent_sdk_adapter.py` (`run_with_claude_agent_sdk`, `_make_sdk_tool`) and `weather_tool.py` (`GET_WEATHER_TOOL`, `get_weather`). A callout says this MCP path is only for backend-tools-only requests.
- **Files:** `backend/agents/tool_rendering.py`, mounted at `/tool-rendering`.
- **HARNESS:** everything the excerpts call but never define: every import, `sdk_tool`/`create_sdk_mcp_server`, `COPILOTKIT_MCP_SERVER_NAME`/`COPILOTKIT_TOOL_PREFIX`, `ExecuteTool`, `_build_sdk_tools`, `_set_state`, `_with_initial_state`, `_normalize_claude_agent_sdk_model`, the `execute_tool` dispatcher, and the caller `stream()` (quickstart prompt and model).
- **Expected finding:** Level 1 (the sister page is ❌). The adapter is only excerpted, with about 8 undefined helpers and constants, and the code that ties `get_weather` into `execute_tool` is never shown. Minor note: the excerpt comment mentions ":8000 /health" and `generate_a2ui` (showcase leftovers).
- **Probe prompt:** "What's the weather in San Francisco?" (the page's own check). Expect the WeatherCard with 68.

## state-rendering (in-content, from generative-ui), NEW
- **Diff vs antigravity:** the antigravity page does not exist ("Not found"). I copied the shape from shared-state-rendering. The Claude page has three excerpts of `shared_state_read_write_agent.py` (prompt, `SET_NOTES_TOOL`, prefs block, `client.messages.stream`, the `set_notes` handler) and `agent_server.py` `/shared-state-read-write`. Frontend: src/ResearchProgress.tsx and App.tsx.
- **Files:** `MyCopilotApp/pages/state-rendering/{App.tsx,src/ResearchProgress.tsx,runtime.ts}` and `backend/agents/state_rendering.py` (an APIRouter mounted under `/state-rendering`, so the endpoint is `/state-rendering/shared-state-read-write`).
- **HARNESS:** `run_shared_state_read_write_agent` (the whole Messages API loop: client, system, messages, tool_calls, msg_id, text and tool events), `normalize_claude_model`, `DEFAULT_ANTHROPIC_MODEL`, every import, the `app` router, and the runtime registering the agent as `researcher`. The page never registers `researcher`.
- **Expected finding:** Level 1, contract mismatch. The backend writes `preferences`/`notes`, but `ResearchProgress` reads `status`/`draft`/`completed`/`total` from agent `researcher`. Nothing the agent does can update the panel; it should stay at "Idle / 0 of ? complete". There is also the undefined runner and helpers, and no agent registration.
- **Probe prompt:** "Write a short report on solar power" (the page's own check), then "remember that I like tea" (exercises set_notes, which the UI still won't show).

## hitl (sidebar)
- **Diff vs antigravity:** Antigravity has an install step, an `experimental_interrupt` server tool and `hitl.py`. Claude has none of these. It shows only a **web `page.tsx` `useHumanInTheLoop` excerpt** (`agentId: "hitl-in-chat"`, `book_call`, `TimePickerCard`, `slots`, all undefined, and web JSX) on an RN page, followed by src/MeetingApproval.tsx (`schedule_meeting`), which is identical to Antigravity's.
- **Files:** `backend/agents/hitl.py` (quickstart adapter), mounted at `/hitl`. The frontend `pages/hitl` stays as is (its App root is an existing HARNESS fill-in).
- **HARNESS:** the whole agent (the page has no Python at all) and the App root.
- **Expected finding:** Level 1 candidate: no backend agent, and a web-only page.tsx excerpt with a different tool name and agentId than the RN MeetingApproval. If the plain quickstart adapter makes the picker work, it is level 3, with a note that the web snippet is on an RN page. The probe decides.
- **Probe prompt:** "Book a meeting about the Q3 roadmap", then tap a slot.

## use-interrupt (sidebar)
- **Diff vs antigravity:** Antigravity has a "Not available for Google Antigravity yet" callout. Claude has `src/agents/interrupt_agent.py` with only `SYSTEM_PROMPT = dedent(...)`, which never imports `dedent` and has no agent or server. The rest is identical (MeetingChat, ApprovalPanel and multi-interrupt fragments, App.tsx).
- **Files:** `backend/agents/use_interrupt.py` (prompt verbatim, plus a HARNESS `dedent` import and the quickstart adapter with that prompt), mounted at `/use-interrupt`.
- **HARNESS:** the `dedent` import, the adapter and the server.
- **Expected finding:** Level 1 if the picker fails. Otherwise level 3: the backend is only a prompt, and the reader must know to put it into the quickstart adapter. That is a fairly obvious fill, so it is a judgment call. The page is titled useInterrupt but uses useHumanInTheLoop (prose explains it): level 4.
- **Probe prompt:** "Book a call with Alice about onboarding", then tap "Tomorrow at 09:00" (the page's own check).
