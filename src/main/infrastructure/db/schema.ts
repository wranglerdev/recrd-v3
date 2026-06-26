import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Drizzle schema for the recrd data model (PRD §6). Hierarchy:
// Project -> Plan -> Suite -> Case -> (Script, Execution); plus Mass per Project.
// Every table carries audit columns (PRD §16).

const auditColumns = {
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  robotPath: text("robot_path"),
  ...auditColumns,
});

export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ...auditColumns,
});

export const suites = sqliteTable("suites", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull(),
  name: text("name").notNull(),
  ...auditColumns,
});

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  suiteId: text("suite_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").$type<"draft" | "ready" | "deprecated">().notNull().default("draft"),
  ...auditColumns,
});

export const scripts = sqliteTable("scripts", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  kind: text("kind").notNull(), // "manual" | "compiled"
  content: text("content").notNull(),
  ...auditColumns,
});

export const executions = sqliteTable("executions", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  startedAt: text("started_at").notNull(),
  result: text("result").notNull(), // "passed" | "failed" | "error"
  durationMs: integer("duration_ms").notNull().default(0),
  log: text("log").notNull().default(""),
  ...auditColumns,
});

export const masses = sqliteTable("masses", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  columns: text("columns").notNull(), // JSON string[]
  rows: text("rows").notNull(), // JSON Record<string,string>[]
  history: text("history").notNull().default("[]"), // JSON MassImport[] (PRD §7)
  ...auditColumns,
});

// Audit trail (PRD §16). Stands apart from the hierarchy tables: it has no audit
// columns of its own (it *is* the audit), and `details` holds a JSON payload that
// the infrastructure store redacts before persisting (PRD §18).
export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  user: text("user").notNull(),
  at: text("at").notNull(),
  details: text("details").notNull().default("{}"), // JSON Record<string, unknown>
});

export const schema = {
  projects,
  plans,
  suites,
  cases,
  scripts,
  executions,
  masses,
  auditEvents,
};
