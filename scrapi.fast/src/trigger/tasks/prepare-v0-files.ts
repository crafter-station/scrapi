import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import type { NetworkLog } from "./capture-network-logs";

const prepareFilesSchema = z.object({
  logs: z.array(
    z.object({
      url: z.string(),
      method: z.string(),
      resourceType: z.string(),
      status: z.number().optional(),
      headers: z.record(z.string()).optional(),
      body: z.union([z.string(), z.record(z.unknown())]).optional(),
      timestamp: z.number(),
    }),
  ),
  userPrompt: z.string(),
  inputSchemaString: z.string(),
  outputSchemaString: z.string(),
  testArgsString: z.string(),
});

export type V0File = {
  name: string;
  content: string;
  locked: boolean;
};

export const prepareV0Files = task({
  id: "prepare-v0-files",
  run: async (
    payload: z.infer<typeof prepareFilesSchema>,
  ): Promise<V0File[]> => {
    const files: V0File[] = payload.logs.map((log, i) => ({
      name: `logs/log-${i}.json`,
      content:
        typeof log.body === "string"
          ? log.body
          : JSON.stringify(log, null, 2),
      locked: true,
    }));

    files.push({
      name: "package.json",
      locked: true,
      content: `{
  "name": "get-data-script",
  "type": "module",
  "private": true,
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5",
    "tsx": "^4.7.0"
  },
  "scripts": {
    "test": "tsx tests/schema.test.ts"
  },
  "dependencies": {
    "zod": "^4.1.12"
  }
}`,
    });

    files.push({
      name: "tests/schema.test.ts",
      locked: true,
      content: `import { getData } from "../scripts/get-data.js";
import { outputSchema } from "../lib/schema.js";

async function test() {
  try {
    const result = await getData(${payload.testArgsString});
    console.log("Result:", JSON.stringify(result, null, 2));
    const validation = outputSchema.safeParse(result);
    if (!validation.success) {
      console.error("Validation failed:", validation.error);
      process.exit(1);
    }
    if (Array.isArray(result) && result.length === 0) {
      console.error("Test failed: returned empty array");
      process.exit(1);
    }
    console.log("Test passed!");
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

test();`,
    });

    files.push({
      name: "tsconfig.json",
      locked: true,
      content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules"]
}`,
    });

    files.push({
      name: "lib/schema.ts",
      locked: true,
      content: `import { z } from "zod";

export const inputSchema = ${payload.inputSchemaString};

export const outputSchema = ${payload.outputSchemaString};`,
    });

    files.push({
      name: "scripts/get-data.ts",
      locked: false,
      content: `import type z from "zod";
import type { inputSchema, outputSchema } from "../lib/schema.js";

export async function getData(
  input: z.infer<typeof inputSchema>,
): Promise<z.infer<typeof outputSchema>> {
  try {
    // write logic here
    // return data
    return [];
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}`,
    });

    return files;
  },
});

