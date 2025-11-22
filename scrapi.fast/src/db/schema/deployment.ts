import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Service } from "./service";

export const DEPLOYMENT_TABLE = "deployment";

export const DeploymentStatus = pgEnum("deployment_status_enum", [
  "draft",
  "active",
  "archived",
]);

export type DeploymentStatusType =
  (typeof DeploymentStatus.enumValues)[number];

export const Deployment = pgTable(DEPLOYMENT_TABLE, {
  id: text("id").primaryKey(),

  service_id: text("service_id")
    .notNull()
    .references(() => Service.id, { onDelete: "cascade" }),

  version: text("version").notNull(),

  status: DeploymentStatus("status").notNull().default("draft"),

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

export const DeploymentInsertSchema = createInsertSchema(Deployment);
export const DeploymentSelectSchema = createSelectSchema(Deployment);

export type DeploymentSelect = typeof Deployment.$inferSelect;
export type DeploymentInsert = typeof Deployment.$inferInsert;
