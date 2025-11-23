import { task } from "@trigger.dev/sdk/v3";
import { v0 } from "v0-sdk";
import { z } from "zod";
import type { V0File } from "./prepare-v0-files";

const generateCodeSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
      locked: z.boolean(),
    }),
  ),
  userPrompt: z.string(),
});

export type V0ChatResponse = {
  chatId: string;
  files?: Array<{
    source?: string;
    meta?: {
      file?: string;
    };
  }>;
};

export const generateCodeWithV0 = task({
  id: "generate-code-with-v0",
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 10000,
  },
  run: async (
    payload: z.infer<typeof generateCodeSchema>,
  ): Promise<V0ChatResponse> => {
    if (!process.env.V0_API_KEY) {
      throw new Error("Missing V0_API_KEY environment variable");
    }

    const chat = await v0.chats.init({
      type: "files",
      files: payload.files.map((f) => ({
        name: f.name,
        content: f.content,
        locked: f.locked,
      })),
    });

    const message = `TASK: Implement getData() in scripts/get-data.ts. DO NOT ask for permission - start coding immediately.

USER PROMPT: ${payload.userPrompt}

WORKFLOW - Follow this order for speed:

1. SCAN LOGS QUICKLY
   - Check logs/ folder for JSON API responses first (fastest path)
   - If no direct JSON API, check HTML responses for embedded __NEXT_DATA__

2. HANDLE __NEXT_DATA__ (VERY COMMON PATTERN)
   Most Next.js sites (like Luma) embed JSON data in HTML:
   \`\`\`
   <script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{...}}}</script>
   \`\`\`

   To extract:
   \`\`\`typescript
   const response = await fetch(url, options);
   const html = await response.text();
   const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)<\\/script>/);
   if (!match) throw new Error("No __NEXT_DATA__ found");
   const nextData = JSON.parse(match[1]);
   const data = nextData.props.pageProps; // Your data is usually here
   \`\`\`

3. **MANDATORY: BUILD STRUCTURE TREE FIRST**
   BEFORE writing any extraction code, analyze the log and build a tree:
   \`\`\`
   Example tree from logs:
   initialData
   ├── kind: "event"
   └── data
       ├── event
       │   ├── api_id
       │   └── name (no hosts here!)
       ├── hosts []        ← hosts is SIBLING to event, not child!
       │   └── [0]
       │       ├── name
       │       └── picture_url
       └── calendar
   \`\`\`
   
   Use this helper to dump structure:
   \`\`\`typescript
   function logStructure(obj: any, name: string, depth = 0): void {
     if (depth > 3) return;
     const indent = "  ".repeat(depth);
     if (Array.isArray(obj)) {
       console.log(\`\${indent}\${name}: Array[\${obj.length}]\`);
       if (obj[0]) logStructure(obj[0], "[0]", depth + 1);
     } else if (obj && typeof obj === "object") {
       console.log(\`\${indent}\${name}: {keys: \${Object.keys(obj).join(", ")}}\`);
       Object.keys(obj).slice(0, 10).forEach(k => logStructure(obj[k], k, depth + 1));
     } else {
       console.log(\`\${indent}\${name}: \${typeof obj}\`);
     }
   }
   \`\`\`

4. **SIBLING VS CHILD - CRITICAL PATTERN**
   Related data is often at the SAME level, not nested:
   - WRONG: \`data.event.hosts\` (assuming hosts is inside event)
   - RIGHT: \`data.hosts\` (hosts is sibling to event)
   
   Common wrapper pattern: \`{kind: "event", data: {...}}\`
   - The actual payload is inside \`data\`, not at root level
   - Always check for \`kind\`/\`type\` + \`data\` wrapper pattern

5. DO NOT HALLUCINATE TYPES OR ASSUME EMPTY
   - NEVER assume a value is null, undefined, or []
   - NEVER assume a key doesn't exist without logging it first
   - If something is undefined, LOG THE PARENT OBJECT to see actual keys
   - If you see "undefined", you have the wrong path - log the parent to find the right key

CRITICAL RULES:

- ONLY use URLs that exist in the log files
- NEVER invent or guess API endpoints
- NEVER guess field names - trace exact paths from the logs
- For nested objects, verify EVERY level of the path exists
- NEVER return empty array [] assuming data doesn't exist - LOG AND VERIFY FIRST
- Match output schema in lib/schema.ts exactly

ACTION REQUIRED:

1. Read logs and BUILD THE STRUCTURE TREE first using logStructure()
2. Identify exact path to target data by tracing the tree
3. Write implementation in scripts/get-data.ts with level-by-level logging:
   \`\`\`typescript
   console.log("Level 1 - pageProps keys:", Object.keys(pageProps));
   console.log("Level 2 - initialData keys:", Object.keys(initialData));
   console.log("Level 3 - data keys:", Object.keys(data));
   // Verify hosts is in data, not in data.event!
   console.log("hosts location check - in data?", "hosts" in data);
   console.log("hosts location check - in event?", "hosts" in data.event);
   \`\`\`
4. Run \`npm test\`
5. If test fails or returns empty, check logs to find correct sibling/child relationship

Map structure first, then code. Speed comes from accuracy, not guessing.

DO NOT modify any file except scripts/get-data.ts.`;

    const response = await v0.chats.sendMessage({
      chatId: chat.id,
      message,
    });

    return {
      chatId: chat.id,
      files: "files" in response ? response.files : undefined,
    };
  },
});

