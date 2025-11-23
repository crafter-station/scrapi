import { task } from "@trigger.dev/sdk/v3";
import Browserbase from "@browserbasehq/sdk";
import { z } from "zod";

const createSessionSchema = z.object({
  projectId: z.string(),
});

export const createBrowserbaseSession = task({
  id: "create-browserbase-session",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: z.infer<typeof createSessionSchema>) => {
    if (!process.env.BROWSERBASE_API_KEY) {
      throw new Error("Missing BROWSERBASE_API_KEY environment variable");
    }

    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY,
    });

    const session = await bb.sessions.create({
      projectId: payload.projectId,
    });

    return {
      sessionId: session.id,
      connectUrl: session.connectUrl,
    };
  },
});

