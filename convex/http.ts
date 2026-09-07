import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyClerkWebhook } from "./lib/webhook";

type ClerkUserEvent = {
  type: string;
  data: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    primary_email_address_id?: string | null;
    email_addresses?: { id: string; email_address: string }[];
  };
};

function nameOf(data: ClerkUserEvent["data"]) {
  const name = [data.first_name, data.last_name]
    .filter((part) => part && part.trim())
    .join(" ")
    .trim();
  return name || undefined;
}

function primaryEmailOf(data: ClerkUserEvent["data"]) {
  const addresses = data.email_addresses ?? [];
  const primary =
    addresses.find((row) => row.id === data.primary_email_address_id) ??
    addresses[0];
  return primary?.email_address;
}

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const raw = await request.text();

    const verified = await verifyClerkWebhook(request.headers, raw);
    if (!verified.ok) {
      return new Response(verified.reason, { status: verified.status });
    }

    let event: ClerkUserEvent;
    try {
      event = JSON.parse(raw) as ClerkUserEvent;
    } catch {
      return new Response("Body was not JSON.", { status: 400 });
    }

    const clerkId = event.data?.id;
    if (!clerkId) return new Response("ok", { status: 200 });

    if (event.type === "user.deleted") {
      await ctx.runMutation(internal.account.purgeByClerkId, { clerkId });
    } else if (event.type === "user.updated") {
      await ctx.runMutation(internal.account.syncFromProvider, {
        clerkId,
        name: nameOf(event.data),
        email: primaryEmailOf(event.data),
      });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
