import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const kworkOffers = pgTable("kwork_offers", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().unique(),
  projectTitle: text("project_title").notNull(),
  projectPrice: integer("project_price").notNull(),
  isMatch: boolean("is_match").notNull(),
  matchReason: text("match_reason"),
  suggestedPrice: integer("suggested_price"),
  proposalText: text("proposal_text"),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type KworkOffer = typeof kworkOffers.$inferSelect;
export type NewKworkOffer = typeof kworkOffers.$inferInsert;
