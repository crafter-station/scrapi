import { logger, schemaTask, wait } from "@trigger.dev/sdk";
import { z } from "zod";
import puppeteer from "puppeteer-core";
import { v0 } from "v0-sdk";
import { enhanceHTMLReadability } from "../lib/enhance-html";
import { Browserbase } from "@browserbasehq/sdk";
import { db } from "../db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

const logSchema = z.object({
  url: z.string(),
  method: z.string(),
  resourceType: z.string(),
  status: z.number().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  timestamp: z.number(),
});

export const scrapePageLogs = schemaTask({
  id: "scrape-page-logs",
  schema: z.object({
    url: z.url(),
    serviceId: z.string().optional(),
  }),
  run: async ({ url, serviceId }) => {
    const logs: z.infer<typeof logSchema>[] = [];

    let session;
    let browser;

    try {
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY,
      });
      session = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to create session: ${message}`);
    }

    try {
      browser = await puppeteer.connect({
        browserWSEndpoint: session.connectUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      throw new Error(`Failed to connect Puppeteer: ${message}`);
    }

    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      request.continue();
    });

    page.on("response", async (response) => {
      const request = response.request();
      const resourceType = request.resourceType();
      if (
        ["image", "stylesheet", "script", "font", "media"].includes(
          resourceType,
        )
      ) {
        return;
      }

      const reqUrl = request.url();
      if (
        request.method() === "OPTIONS" ||
        reqUrl.includes("infobip.com") ||
        reqUrl.includes("tiktokw.us") ||
        reqUrl.includes("google.com") ||
        reqUrl.includes("clarity.ms") ||
        reqUrl.includes("hs-sites.com") ||
        reqUrl.includes("wonderpush.com") ||
        reqUrl.includes("hubspot.com") ||
        reqUrl.includes("brevo.com") ||
        reqUrl.includes("kommo.com") ||
        reqUrl.includes("appspot.com") ||
        reqUrl.includes("ads.linkedin.com") ||
        reqUrl.includes("sentry.io") ||
        reqUrl.includes("doubleclick.net") ||
        reqUrl.includes("hubapi.com") ||
        reqUrl.includes("hs-banner.com") ||
        reqUrl.includes("hotjar.io") ||
        reqUrl.includes("amplitude.com") ||
        reqUrl.includes("adtrafficquality.google") ||
        reqUrl.startsWith("https://analytics.google.com") ||
        reqUrl.startsWith("https://api.wonderpush.com") ||
        reqUrl.startsWith("https://o.clarity.ms") ||
        reqUrl.startsWith("https://www.google.com/measurement") ||
        reqUrl.startsWith("https://www.google.com/ccm") ||
        reqUrl.startsWith("https://cdn.cookielaw.org") ||
        reqUrl.startsWith("https://api.retargetly.com") ||
        reqUrl.startsWith("https://geolocation.onetrust.com") ||
        reqUrl.startsWith("https://api.infobip.com") ||
        reqUrl.startsWith("https://api2.infobip.net") ||
        reqUrl.startsWith("https://livechat.infobip.com") ||
        reqUrl.startsWith("https://forms.hscollectedforms.net/") ||
        reqUrl.startsWith("https://www.googletagmanager.com/") ||
        reqUrl.startsWith("https://analytics.tiktok.com") ||
        reqUrl.startsWith("https://www.facebook.com") ||
        reqUrl.startsWith("https://forms.hscollectedforms.net") ||
        reqUrl.startsWith("https://www.google-analytics.com") ||
        reqUrl.startsWith("https://stats.g.doubleclick.net") ||
        reqUrl.startsWith("https://www.gstatic.com") ||
        reqUrl.startsWith("https://y.clarity.ms") ||
        reqUrl.includes("_next/static/") ||
        reqUrl.includes("_nuxt/") ||
        reqUrl.includes("_i18n/") ||
        reqUrl.endsWith(".ico") ||
        reqUrl.endsWith(".php") ||
        reqUrl.endsWith(".svg") ||
        reqUrl.endsWith("site.webmanifest")
      ) {
        return;
      }

      let body: string | object | undefined;
      try {
        const contentType = response.headers()["content-type"] || "";
        if (contentType.includes("application/json")) {
          body = await response.json();
        } else if (contentType.includes("text/")) {
          body = await response.text();
        }
      } catch {
        body = undefined;
      }

      if (body) {
        logs.push({
          url: request.url(),
          method: request.method(),
          resourceType,
          status: response.status(),
          headers: response.headers(),
          body: enhanceHTMLReadability(body as string),
          timestamp: Date.now(),
        });
      }
    });

    await page.goto(url);
    await wait.for({ seconds: 10 });
    await page.close();
    await browser.close();

    if (serviceId && session?.id) {
      await db
        .update(schema.Service)
        .set({
          browser_session: session.id,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Service.id, serviceId));

      logger.info("Saved browser session to database", {
        serviceId,
        sessionId: session.id,
      });
    }

    return {
      logs,
      sessionId: session?.id,
    };
  },
});

export const generateScraperScript = schemaTask({
  id: "generate-scraper-script",
  schema: z.object({
    logs: z.array(logSchema),
    userPrompt: z.string(),
    inputSchemaString: z.string(),
    outputSchemaString: z.string(),
    testArgsString: z.string(),
    serviceId: z.string().optional(),
  }),
  run: async ({
    logs,
    userPrompt,
    inputSchemaString,
    outputSchemaString,
    testArgsString,
    serviceId,
  }) => {
    const V0_API_KEY = process.env.V0_API_KEY;
    if (!V0_API_KEY) {
      throw new Error("Missing V0_API_KEY");
    }

    const files = logs.map((log, i) => ({
      name: `logs/log-${i}.json`,
      content: typeof log === "string" ? log : JSON.stringify(log, null, 2),
      locked: true,
    }));

    files.push({
      name: "package.json",
      locked: true,
      content: `{
      "name": "get-data-script",
      "module": "index.ts",
      "type": "module",
      "private": true,
      "devDependencies": {
        "@types/bun": "latest"
      },
      "scripts": {
        "test": "bun test"
      },
      "peerDependencies": {
        "typescript": "^5"
      },
      "dependencies": {
        "zod": "^4.1.12"
      }
    }
`,
    });

    files.push({
      name: "tests/schema.test.ts",
      locked: true,
      content: `import { expect, test, describe } from "bun:test";
    import { getData } from "../scripts/get-data";
    import { outputSchema } from "../lib/schema";

    describe("schema validation test", () => {
      test("should run getData with parameters", async () => {
        const result = await getData(${testArgsString});

        console.log("Result:", JSON.stringify(result, null, 2));

        expect(outputSchema.safeParse(result).success).toBe(true);
      });
    });`,
    });

    files.push({
      name: "lib/schema.ts",
      locked: true,
      content: `
import { z } from 'zod';

export const inputSchema = ${inputSchemaString};

export const outputSchema = ${outputSchemaString};
`,
    });

    files.push({
      name: "scripts/get-data.js",
      locked: false,
      content: `
export async function getData(input) {
  try {
    // write logic here
    // return data
    return [];
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
`,
    });

    const chat = await v0.chats.init({
      type: "files",
      files,
    });

    if (serviceId) {
      await db
        .update(schema.Service)
        .set({
          agent_chat_id: chat.id,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Service.id, serviceId));

      logger.info("Saved agent chat ID to database", {
        serviceId,
        chatId: chat.id,
      });
    }

    const response = await v0.chats.sendMessage({
      chatId: chat.id,
      message: `TASK: Implement getData() in scripts/get-data.js. DO NOT ask for permission - start coding immediately.

CRITICAL: ONLY modify scripts/get-data.js - do NOT create or modify any other files.

FORBIDDEN - DO NOT DO ANY OF THESE:
- Do NOT import or require any external libraries (only use built-in fetch)
- Do NOT use fs, path, or any file system operations
- Do NOT try to read the log files programmatically in get-data.js
- Do NOT use cheerio, puppeteer, axios, or any npm packages
- The logs/ folder is for YOUR analysis only - extract URLs and patterns from them, then use fetch() to get live data

IMPORTANT: Write pure JavaScript, NOT TypeScript. Do not use any type annotations, generics, or TypeScript syntax.

MANDATORY DEBUGGING: You MUST add console.log statements throughout getData() for debugging:
- Log Object.keys() for EVERY object you traverse
- Log intermediate values at each step
- Log array lengths before mapping
- Without these logs, you CANNOT debug empty results or errors
The console output is captured and shown to you for debugging.

USER PROMPT: ${userPrompt}

WORKFLOW - Follow this order for speed:

1. **PRIORITY 1: CHECK LOGS FOR DIRECT JSON API RESPONSES**
   - Look in logs/ folder for responses with resourceType "fetch" or "xhr"
   - These contain direct JSON data - the FASTEST and most reliable path
   - If you find JSON API responses, use those URLs directly with fetch()

2. **PRIORITY 2: IF NO JSON API, CHECK HTML FOR EMBEDDED DATA**
   Not all websites have JSON APIs. Many embed data directly in HTML. Try these patterns IN ORDER:

   **Pattern A: __NEXT_DATA__ (Next.js sites only)**
   \`\`\`javascript
   const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\\s\\S]*?)<\\/script>/);
   if (match) {
     const nextData = JSON.parse(match[1]);
     const data = nextData.props.pageProps;
   }
   \`\`\`

   **Pattern B: Other JSON script tags**
   \`\`\`javascript
   const jsonScripts = html.match(/<script[^>]*type="application\\/json"[^>]*>([\\s\\S]*?)<\\/script>/g);
   if (jsonScripts) {
     for (const script of jsonScripts) {
       const content = script.match(/>([\\s\\S]*?)<\\/script>/)[1];
       const data = JSON.parse(content);
       console.log("Found JSON script:", Object.keys(data));
     }
   }
   \`\`\`

   **Pattern C: Window/global variables**
   \`\`\`javascript
   const patterns = [
     /window\\.__DATA__\\s*=\\s*({[\\s\\S]*?});/,
     /window\\.pageData\\s*=\\s*({[\\s\\S]*?});/,
     /__INITIAL_STATE__\\s*=\\s*({[\\s\\S]*?});/,
     /window\\.__PRELOADED_STATE__\\s*=\\s*({[\\s\\S]*?});/,
   ];
   for (const pattern of patterns) {
     const match = html.match(pattern);
     if (match) {
       const data = JSON.parse(match[1]);
       console.log("Found window data:", Object.keys(data));
     }
   }
   \`\`\`

   **Pattern D: JSON-LD structured data**
   \`\`\`javascript
   const jsonLdMatch = html.match(/<script[^>]*type="application\\/ld\\+json"[^>]*>([\\s\\S]*?)<\\/script>/);
   if (jsonLdMatch) {
     const structuredData = JSON.parse(jsonLdMatch[1]);
     console.log("Found JSON-LD:", Object.keys(structuredData));
   }
   \`\`\`

   **Pattern E: Data attributes in HTML elements**
   \`\`\`javascript
   const dataAttrMatch = html.match(/data-props="([^"]+)"/);
   if (dataAttrMatch) {
     const data = JSON.parse(decodeURIComponent(dataAttrMatch[1]));
   }
   \`\`\`

   **IMPORTANT: If __NEXT_DATA__ is not found, DO NOT throw an error. Try the other patterns above.**

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
   function logStructure(obj, name, depth = 0) {
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
3. Write implementation in scripts/get-data.js with level-by-level logging:
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

REMEMBER:
- Add console.log for EVERY step of data extraction
- Log object keys: console.log("keys:", Object.keys(obj))
- Log values before using them
- Without logs, debugging is impossible

ONLY modify scripts/get-data.js. Do NOT create, modify, or touch any other files.
`,
    });

    const responseFiles = "files" in response ? response.files : undefined;
    const scriptFile = responseFiles?.find((f) =>
      f.meta?.file?.toString().includes("scripts/get-data.js"),
    );

    let finalScript = scriptFile?.source || "// No script generated";
    let testPassed = false;

    logger.info("Starting test execution");
    const apiUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/run-test`
      : "http://localhost:3000/api/run-test";

    logger.info("API URL", { apiUrl });
    logger.info("Input schema string", { inputSchemaString });
    logger.info("Output schema string", { outputSchemaString });
    logger.info("Test args string", { testArgsString });
    logger.info("Script preview", { script: finalScript.substring(0, 500) });

    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      logger.info(`Calling run-test API attempt ${attempt + 1}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputSchemaString,
          outputSchemaString,
          testArgsString,
          script: finalScript,
        }),
      });

      logger.info("API response status", { status: response.status });

      const { testResult, passed, returnedEmpty } = await response.json();

      logger.info(`Attempt ${attempt + 1}/${MAX_RETRIES}`, { testResult });

      if (passed && !returnedEmpty) {
        testPassed = true;
        logger.info("Tests passed with data!");
        break;
      }

      if (attempt === MAX_RETRIES - 1) {
        logger.info("All retries exhausted");
        break;
      }

      const failureReason = returnedEmpty
        ? "passed but returned empty array - data extraction failed"
        : "failed";

      logger.info(
        `Attempt ${attempt + 1} ${failureReason}, sending error to v0...`,
      );

      const retryResponse = await v0.chats.sendMessage({
        chatId: chat.id,
        message: `The test ${returnedEmpty ? "passed but returned EMPTY ARRAY" : "failed"}: ${testResult}

${
  returnedEmpty
    ? `CRITICAL: An empty array [] is NOT acceptable. The data EXISTS in the logs.
You are accessing the wrong keys. Log the parent objects with Object.keys() and JSON.stringify() to find the correct path.
Do NOT assume data doesn't exist - trace the actual structure.`
    : "Please fix the error and try again."
}

Check your console.log output to debug the issue.
Remember: trace exact paths from the logs, do not guess field names.`,
      });

      const retryFiles =
        "files" in retryResponse ? retryResponse.files : undefined;
      const retryScriptFile = retryFiles?.find((f) =>
        f.meta?.file?.toString().includes("scripts/get-data.js"),
      );

      if (retryScriptFile?.source) {
        finalScript = retryScriptFile.source;
      }

      logger.info("Files updated for retry");
    }

    if (serviceId) {
      await db
        .update(schema.Service)
        .set({
          script: finalScript,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Service.id, serviceId));

      logger.info("Saved final script to database", {
        serviceId,
        testPassed,
        scriptLength: finalScript.length,
      });
    }

    return {
      chatId: chat.id,
      script: finalScript,
      testPassed,
      attempts: MAX_RETRIES,
    };
  },
});

export const getScriptTask = schemaTask({
  id: "get-script",
  schema: z.object({
    serviceId: z.string(),
  }),
  run: async (payload) => {
    const { serviceId } = payload;

    logger.info("Fetching service from database", { serviceId });

    const [service] = await db
      .select()
      .from(schema.Service)
      .where(eq(schema.Service.id, serviceId))
      .limit(1);

    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    if (!service.url) {
      throw new Error(`Service URL is required: ${serviceId}`);
    }

    logger.info("Service loaded", {
      serviceId,
      name: service.name,
      url: service.url,
    });

    const scrapeResult = await scrapePageLogs.triggerAndWait({
      url: service.url,
      serviceId,
    });

    if (!scrapeResult.ok) {
      const errorMsg =
        typeof scrapeResult.error === "string"
          ? scrapeResult.error
          : JSON.stringify(scrapeResult.error, null, 2) ||
            String(scrapeResult.error);
      throw new Error(`Scraping failed: ${errorMsg}`);
    }

    const generateResult = await generateScraperScript.triggerAndWait({
      logs: scrapeResult.output.logs,
      userPrompt: service.user_prompt || "",
      inputSchemaString: service.schema_input || "z.object({})",
      outputSchemaString: service.schema_output || "z.array(z.object({}))",
      testArgsString: service.example_input || "{}",
      serviceId,
    });

    if (!generateResult.ok) {
      const errorMsg =
        typeof generateResult.error === "string"
          ? generateResult.error
          : JSON.stringify(generateResult.error, null, 2) ||
            String(generateResult.error);
      throw new Error(`Script generation failed: ${errorMsg}`);
    }

    return {
      script: generateResult.output.script,
      testPassed: generateResult.output.testPassed,
      chatId: generateResult.output.chatId,
      serviceId,
      sessionId: scrapeResult.output.sessionId,
      service: {
        name: service.name,
        url: service.url,
      },
    };
  },
});
