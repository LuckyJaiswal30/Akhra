import { internalMutation } from "./_generated/server";

export const backfillAccountState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    let statusSet = 0;
    let profileMarked = 0;

    for (const user of users) {
      const patch: Record<string, unknown> = {};

      if (user.status === undefined) {
        patch.status = "active";
        statusSet += 1;
      }

      if (
        user.profileCompletedAt === undefined &&
        user.district &&
        user.designation
      ) {
        patch.profileCompletedAt = user.createdAt;
        profileMarked += 1;
      }

      if (Object.keys(patch).length > 0) await ctx.db.patch(user._id, patch);
    }

    return { users: users.length, statusSet, profileMarked };
  },
});
