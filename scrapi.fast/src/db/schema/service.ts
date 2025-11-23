import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Project } from "./project";

export const SERVICE_TABLE = "service";

export const Service = pgTable(SERVICE_TABLE, {
  id: text("id").primaryKey(),

  project_id: text("project_id")
    .notNull()
    .references(() => Project.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),

  script: text("script").notNull(),

  agent_chat_id: text("agent_chat_id"),
  browser_session: text("browser_session"),
  schema_input: text("schema_input"),
  schema_output: text("schema_output"),
  example_input: text("example_input"),

  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
});

export const ServiceInsertSchema = createInsertSchema(Service);
export const ServiceSelectSchema = createSelectSchema(Service);

export type ServiceSelect = typeof Service.$inferSelect;
export type ServiceInsert = typeof Service.$inferInsert;
