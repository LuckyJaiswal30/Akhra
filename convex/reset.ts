import { internalMutation } from "./_generated/server";

const TABLES = [
  "webhookEvents",
  "uploadIntents",
  "auditLog",
  "invitations",
  "notifications",
  "pledges",
  "milestones",
  "projectMembers",
  "projects",
  "routings",
  "problemEmbeddings",
  "problemMedia",
  "problems",
  "clusters",
  "partners",
  "departments",
  "universities",
  "users",
] as const;

export const wipeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed: Record<string, number> = {};

    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        if (table === "problemMedia") {
          const media = row as { storageId?: string };
          if (media.storageId) {
            await ctx.storage.delete(media.storageId as never);
          }
        }
        await ctx.db.delete(row._id);
      }
      removed[table] = rows.length;
    }

    return removed;
  },
});

export const wipeProblemsOnly = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "uploadIntents",
      "auditLog",
      "notifications",
      "pledges",
      "milestones",
      "projectMembers",
      "projects",
      "routings",
      "problemEmbeddings",
      "problemMedia",
      "problems",
      "clusters",
    ] as const;

    const removed: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        if (table === "uploadIntents") {
          const intent = row as { storageId?: string };
          if (intent.storageId) await ctx.storage.delete(intent.storageId as never);
        }
        await ctx.db.delete(row._id);
      }
      removed[table] = rows.length;
    }
    return removed;
  },
});
