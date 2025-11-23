import { task } from "@trigger.dev/sdk/v3";
import { v0 } from "v0-sdk";
import { z } from "zod";

const retryCodeSchema = z.object({
  chatId: z.string(),
  testResult: z.string(),
  returnedEmpty: z.boolean(),
});

export type RetryResponse = {
  files?: Array<{
    source?: string;
    meta?: {
      file?: string;
    };
  }>;
};

export const retryCodeGeneration = task({
  id: "retry-code-generation",
  retry: {
    maxAttempts: 1,
  },
  run: async (
    payload: z.infer<typeof retryCodeSchema>,
  ): Promise<RetryResponse> => {
    if (!process.env.V0_API_KEY) {
      throw new Error("Missing V0_API_KEY environment variable");
    }

    const failureReason = payload.returnedEmpty
      ? "passed but returned empty array - data extraction failed"
      : "failed";

    const message = `The test ${payload.returnedEmpty ? "passed but returned EMPTY ARRAY" : "failed"}: ${payload.testResult}

${
  payload.returnedEmpty
    ? `CRITICAL: An empty array [] is NOT acceptable. The data EXISTS in the logs.
You are accessing the wrong keys. Log the parent objects with Object.keys() and JSON.stringify() to find the correct path.
Do NOT assume data doesn't exist - trace the actual structure.`
    : "Please fix the error and try again."
}

Check your console.log output to debug the issue.
Remember: trace exact paths from the logs, do not guess field names.`;

    const response = await v0.chats.sendMessage({
      chatId: payload.chatId,
      message,
    });

    return {
      files: "files" in response ? response.files : undefined,
    };
  },
});

