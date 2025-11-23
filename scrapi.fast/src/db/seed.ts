import { db } from "./index";
import * as schema from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  const projectId = "project-demo";
  const serviceId = "service-hackernews";

  console.log("Creating project...");
  await db
    .insert(schema.Project)
    .values({
      id: projectId,
      user_id: "user-demo",
      name: "Demo Project",
      description: "Hackathon demo project",
    })
    .onConflictDoNothing();

  console.log("Creating service...");
  await db
    .insert(schema.Service)
    .values({
      id: serviceId,
      project_id: projectId,
      name: "HackerNews Scraper",
      description: "Get top 10 news from HackerNews",
      url: "https://news.ycombinator.com",
      user_prompt: "Generate a function to get the top 10 news from hackernews",
      schema_input: "z.object({})",
      schema_output:
        "z.array(z.object({ name: z.string().min(1), points: z.number().min(0), url: z.url().optional(), author: z.string().min(1).optional()}))",
      example_input: "{}",
      script: null,
      agent_chat_id: null,
      browser_session: null,
    })
    .onConflictDoNothing();

  console.log("✅ Seed completed!");
  console.log(`Project ID: ${projectId}`);
  console.log(`Service ID: ${serviceId}`);
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .then(() => {
    console.log("Exiting...");
    process.exit(0);
  });
