// governed-actions: the page's only agent code is a Python LangGraph agent.py (langchain_core @tool +
// langgraph.types.interrupt), wrong framework for Claude Agent SDK TypeScript. Kept below as a string for the IDE
// segment. HARNESS (whole file): served by the quickstart's ClaudeAgentAdapter, so only the page's
// useHumanInTheLoop tool-call path (approve_governed_action, a frontend tool) can run.
import type { Express } from "express";
import type { RunAgentInput } from "@ag-ui/core";
import { quickstartAgent, streamAdapter } from "./state-plain.harness.js";

// DOC (Python, verbatim, not runnable here): agent.py
export const DOC_AGENT_PY = String.raw`
import hashlib
import json

from langchain_core.tools import tool
from langgraph.types import interrupt


@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email. The user must approve it first."""
    arguments = {"to": to, "subject": subject, "body": body}
    action = {
        # Derive the id from the arguments: LangGraph runs the tool again on resume.
        "id": hashlib.sha256(json.dumps(arguments, sort_keys=True).encode()).hexdigest()[:16],
        "summary": f"Send an email to {to}",
        "tool": "send_email",
        "reference": "policy:outbound-email",
        "verdict": "require_approval",
        "arguments": arguments,
    }

    response = interrupt({"action": action})

    if (
        isinstance(response, dict)
        and response.get("approved")
        and response.get("actionId") == action["id"]
        and response.get("reference") == action["reference"]
    ):
        deliver_email(to, subject, body)  # your own email client
        return f"Email sent to {to}."

    return "The user did not approve this action. The email was not sent."
`;
// END DOC

export function register(app: Express) {
  app.post("/governed-actions", (req, res) => streamAdapter(res, req.body as RunAgentInput, quickstartAgent()));
}
