import { useCallback, useRef, useState } from "react";
import { useFrontendTool } from "@copilotkit/react-native/headless";
import { z } from "zod";

type Request = { topic: string };

export function useMeetingRequest() {
  const [request, setRequest] = useState<Request | null>(null);
  const resolver = useRef<((answer: unknown) => void) | null>(null);

  useFrontendTool({
    name: "schedule_meeting",
    description: "Ask the user to pick a meeting time.",
    parameters: z.object({ topic: z.string() }),
    handler: (args) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(args);
      }),
  });

  const answer = useCallback((value: unknown) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  }, []);

  return { request, answer };
}
