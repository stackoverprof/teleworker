import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  message: text("message").notNull(),
  chatIds: text("chat_ids").notNull(),
  when: text("when").notNull(),
  apiUrl: text("api_url"),
  ring: integer("ring").notNull().default(0),
  active: integer("active").notNull().default(1),
  count: integer("count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
