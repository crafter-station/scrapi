import { auth } from "@clerk/nextjs/server";
import { groq } from "@ai-sdk/groq";
import { tasks } from "@trigger.dev/sdk/v3";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, Project, Service } from "@/db";
import type { getScriptTask } from "@/trigger/get-script.task";
import { aiRatelimit, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResponse = await checkRateLimit(aiRatelimit, userId);
  if (rateLimitResponse) return rateLimitResponse;

  const { prompt: userPrompt } = await request.json();

  if (!userPrompt) {
    return Response.json(
      { error: "Missing required field: prompt" },
      { status: 400 },
    );
  }

  // Step 1: Extract URL and query from user's single prompt
  const { object: extractedEntities } = await generateObject({
    model: groq("openai/gpt-oss-120b"),
    schema: z.object({
      url: z
        .string()
        .url()
        .describe(
          "The URL to scrape, extracted from the user's prompt. Must be a valid URL with protocol (https://)",
        ),
      query: z
        .string()
        .describe(
          "The extraction goal - what data to scrape from the URL. Extracted from the user's prompt.",
        ),
    }),
    prompt: `Extract the URL and the scraping goal from this user request:

"${userPrompt}"

Your task:
1. url: Identify and extract the URL from the request. Ensure it has proper protocol (https://)
2. query: Extract what data the user wants to scrape from that URL

Examples:
- Input: "Extract all product names and prices from https://example.com/products"
  Output: { url: "https://example.com/products", query: "Extract all product names and prices" }

- Input: "Get event hosts names and photos from https://luma.com/event-id"
  Output: { url: "https://luma.com/event-id", query: "Get event hosts names and photos" }`,
  });

  const { url, query: prompt } = extractedEntities;

  let [project] = await db
    .select()
    .from(Project)
    .where(eq(Project.user_id, userId))
    .limit(1);

  if (!project) {
    const projectId = nanoid();
    [project] = await db
      .insert(Project)
      .values({
        id: projectId,
        user_id: userId,
        name: "My Project",
      })
      .returning();
  }

  // Step 2: Generate service configuration using extracted entities
  const { object } = await generateObject({
    model: groq("openai/gpt-oss-120b"),
    schema: z.object({
      name: z.string().describe("A short name for this scraping service"),
      description: z
        .string()
        .describe("Brief description of what the service does"),
      inputSchemaString: z
        .string()
        .describe(
          "A Zod schema string for input parameters (e.g., 'z.object({ id: z.string() })')",
        ),
      outputSchemaString: z
        .string()
        .describe(
          "A Zod schema string for expected output data (e.g., 'z.array(z.object({ name: z.string(), price: z.number() }))')",
        ),
      testArgsString: z
        .string()
        .describe(
          "Example test arguments as a JavaScript object literal matching the input schema (e.g., '{ id: \"123\" }')",
        ),
    }),
    prompt: `You are creating a web scraping service configuration.

URL to scrape: ${url}

User's request: ${prompt}

Generate the configuration for this scraping service:
1. name: A concise name for this service (2-4 words)
2. description: What data this service extracts
3. inputSchemaString: Zod schema for any input parameters needed (use z.object({}) if no input needed)
4. outputSchemaString: Zod schema for the data structure that will be returned
5. testArgsString: Example arguments to test the scraper with

Make sure the schemas are valid Zod syntax that can be evaluated with new Function().`,
  });

  const serviceId = nanoid();

  await db.insert(Service).values({
    id: serviceId,
    project_id: project.id,
    name: object.name,
    description: object.description,
    url,
    user_prompt: prompt,
    schema_input: object.inputSchemaString,
    schema_output: object.outputSchemaString,
    example_input: object.testArgsString,
  });

  const handle = await tasks.trigger<typeof getScriptTask>("get-script", {
    serviceId,
  });

  return Response.json({
    serviceId,
    taskId: handle.id,
  });
}
