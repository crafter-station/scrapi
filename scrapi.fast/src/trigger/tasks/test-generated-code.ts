import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const execAsync = promisify(exec);

const testCodeSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
    }),
  ),
  testArgsString: z.string(),
  workDir: z.string(),
});

export type TestResult = {
  passed: boolean;
  returnedEmpty: boolean;
  output: string;
  error?: string;
};

export const testGeneratedCode = task({
  id: "test-generated-code",
  run: async (
    payload: z.infer<typeof testCodeSchema>,
  ): Promise<TestResult> => {
    const workDir = payload.workDir;

    try {
      for (const file of payload.files) {
        const filePath = join(workDir, file.name);
        const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));

        await mkdir(dirPath, { recursive: true });
        await writeFile(filePath, file.content, "utf-8");
      }

      const testCommand = `cd ${workDir} && npm install --silent && npm test 2>&1`;
      const { stdout, stderr } = await execAsync(testCommand, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const output = stdout + stderr;
      const testPassed =
        output.includes("Test passed!") &&
        !output.includes("fail") &&
        !output.includes("Error") &&
        !output.includes("process.exit");
      const returnedEmpty =
        output.includes("Result: []") ||
        output.includes("returning empty array") ||
        output.includes('"Result": []') ||
        output.includes("returned empty array");

      return {
        passed: testPassed && !returnedEmpty,
        returnedEmpty,
        output,
        error: testPassed ? undefined : output,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        passed: false,
        returnedEmpty: false,
        output: errorMessage,
        error: errorMessage,
      };
    }
  },
});

