import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createBrowserbaseSession } from "./create-browserbase-session";
import { captureNetworkLogs } from "./capture-network-logs";
import { prepareV0Files } from "./prepare-v0-files";
import { generateCodeWithV0 } from "./generate-code-with-v0";
import { testGeneratedCode } from "./test-generated-code";
import { retryCodeGeneration } from "./retry-code-generation";

const scrapeAndGenerateSchema = z.object({
  url: z.string(),
  userPrompt: z.string(),
  inputSchemaString: z.string(),
  outputSchemaString: z.string(),
  testArgsString: z.string(),
  projectId: z.string().optional(),
  waitTimeSeconds: z.number().default(10),
  maxRetries: z.number().default(5),
});

export const scrapeAndGenerate = task({
  id: "scrape-and-generate",
  maxDuration: 3600,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: z.infer<typeof scrapeAndGenerateSchema>) => {
    if (!process.env.BROWSERBASE_API_KEY) {
      throw new Error("Missing BROWSERBASE_API_KEY environment variable");
    }

    const projectId = payload.projectId || process.env.BROWSERBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error("Missing BROWSERBASE_PROJECT_ID environment variable or projectId in payload");
    }

    if (!process.env.V0_API_KEY) {
      throw new Error("Missing V0_API_KEY environment variable");
    }

    const workDir = await mkdtemp(join(tmpdir(), "scrapi-"));

    try {
      const sessionResult = await createBrowserbaseSession.triggerAndWait({
        projectId,
      });

      if (!sessionResult.ok) {
        throw new Error(`Failed to create session: ${sessionResult.error}`);
      }

      const logsResult = await captureNetworkLogs.triggerAndWait({
        connectUrl: sessionResult.output.connectUrl,
        url: payload.url,
        waitTimeSeconds: payload.waitTimeSeconds,
      });

      if (!logsResult.ok) {
        throw new Error(`Failed to capture logs: ${logsResult.error}`);
      }

      const filesResult = await prepareV0Files.triggerAndWait({
        logs: logsResult.output,
        userPrompt: payload.userPrompt,
        inputSchemaString: payload.inputSchemaString,
        outputSchemaString: payload.outputSchemaString,
        testArgsString: payload.testArgsString,
      });

      if (!filesResult.ok) {
        throw new Error(`Failed to prepare files: ${filesResult.error}`);
      }

      const generateResult = await generateCodeWithV0.triggerAndWait({
        files: filesResult.output,
        userPrompt: payload.userPrompt,
      });

      if (!generateResult.ok) {
        throw new Error(`Failed to generate code: ${generateResult.error}`);
      }

      const responseFiles = generateResult.output.files;
      const schemaFile = responseFiles?.find((f) =>
        f.meta?.file?.toString().includes("lib/schema.ts"),
      );
      const scriptFile = responseFiles?.find((f) =>
        f.meta?.file?.toString().includes("scripts/get-data.ts"),
      );
      const testFile = responseFiles?.find((f) =>
        f.meta?.file?.toString().includes("tests/schema.test.ts"),
      );

      const updatedFiles = [...filesResult.output];
      if (schemaFile?.source) {
        const schemaIndex = updatedFiles.findIndex((f) =>
          f.name.includes("lib/schema.ts"),
        );
        if (schemaIndex >= 0) {
          updatedFiles[schemaIndex] = {
            ...updatedFiles[schemaIndex],
            content: schemaFile.source,
          };
        }
      }
      if (scriptFile?.source) {
        const scriptIndex = updatedFiles.findIndex((f) =>
          f.name.includes("scripts/get-data.ts"),
        );
        if (scriptIndex >= 0) {
          updatedFiles[scriptIndex] = {
            ...updatedFiles[scriptIndex],
            content: scriptFile.source,
          };
        }
      }
      if (testFile?.source) {
        const testIndex = updatedFiles.findIndex((f) =>
          f.name.includes("tests/schema.test.ts"),
        );
        if (testIndex >= 0) {
          updatedFiles[testIndex] = {
            ...updatedFiles[testIndex],
            content: testFile.source,
          };
        }
      }

      let attempt = 0;
      let finalResult: { passed: boolean; returnedEmpty: boolean; output: string } | null = null;

      while (attempt < payload.maxRetries) {
        const testResult = await testGeneratedCode.triggerAndWait({
          files: updatedFiles.map((f) => ({
            name: f.name,
            content: f.content,
          })),
          testArgsString: payload.testArgsString,
          workDir,
        });

        if (!testResult.ok) {
          throw new Error(`Failed to test code: ${testResult.error}`);
        }

        finalResult = testResult.output;

        if (finalResult.passed && !finalResult.returnedEmpty) {
          break;
        }

        if (attempt === payload.maxRetries - 1) {
          break;
        }

        const retryResult = await retryCodeGeneration.triggerAndWait({
          chatId: generateResult.output.chatId,
          testResult: finalResult.output,
          returnedEmpty: finalResult.returnedEmpty,
        });

        if (!retryResult.ok) {
          throw new Error(`Failed to retry generation: ${retryResult.error}`);
        }

        const retryFiles = retryResult.output.files;
        const retryScriptFile = retryFiles?.find((f) =>
          f.meta?.file?.toString().includes("scripts/get-data.ts"),
        );
        const retryTestFile = retryFiles?.find((f) =>
          f.meta?.file?.toString().includes("tests/schema.test.ts"),
        );

        if (retryScriptFile?.source) {
          const scriptIndex = updatedFiles.findIndex((f) =>
            f.name.includes("scripts/get-data.ts"),
          );
          if (scriptIndex >= 0) {
            updatedFiles[scriptIndex] = {
              ...updatedFiles[scriptIndex],
              content: retryScriptFile.source,
            };
          }
        }
        if (retryTestFile?.source) {
          const testIndex = updatedFiles.findIndex((f) =>
            f.name.includes("tests/schema.test.ts"),
          );
          if (testIndex >= 0) {
            updatedFiles[testIndex] = {
              ...updatedFiles[testIndex],
              content: retryTestFile.source,
            };
          }
        }

        attempt++;
      }

      return {
        sessionId: sessionResult.output.sessionId,
        sessionUrl: `https://browserbase.com/sessions/${sessionResult.output.sessionId}`,
        logsCount: logsResult.output.length,
        attempts: attempt + 1,
        testPassed: finalResult?.passed ?? false,
        returnedEmpty: finalResult?.returnedEmpty ?? false,
        testOutput: finalResult?.output ?? "",
        generatedFiles: updatedFiles.map((f) => ({
          name: f.name,
          locked: f.locked,
        })),
      };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  },
});

