import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { verifyClerkWebhook } from "./lib/webhook";
import { MAX_PHOTO_BYTES } from "./lib/upload";

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
  path: "/upload-photo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return new Response("You need to be signed in.", { status: 401 });

    const form = await request.formData();
    const uploadId = form.get("uploadId");
    const file = form.get("file");
    if (typeof uploadId !== "string" || !(file instanceof Blob)) {
      return new Response("Upload form is invalid.", { status: 400 });
    }
    if (!file.type.startsWith("image/") || file.size > MAX_PHOTO_BYTES) {
      return new Response("Photos must be images under 8 MB each.", { status: 400 });
    }

    const storageId = await ctx.storage.store(file);
    try {
      await ctx.runMutation(internal.problems.attachUploadedFile, {
        uploadId: uploadId as Id<"uploadIntents">,
        storageId,
        tokenIdentifier: identity.tokenIdentifier,
      });
    } catch (error) {
      await ctx.storage.delete(storageId);
      return new Response(
        error instanceof Error ? error.message : "Upload could not be attached.",
        { status: 400 },
      );
    }

    return Response.json({ storageId });
  }),
});

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

    const eventId = request.headers.get("svix-id");
    if (!eventId) return new Response("Missing event ID.", { status: 400 });

    const claimed = await ctx.runMutation(internal.account.claimWebhookEvent, {
      eventId,
      now: Date.now(),
    });
    if (!claimed) return new Response("ok", { status: 200 });

    try {
      if (event.type === "user.deleted") {
        await ctx.runMutation(internal.account.purgeByClerkId, { clerkId });
      } else if (event.type === "user.updated") {
        await ctx.runMutation(internal.account.syncFromProvider, {
          clerkId,
          name: nameOf(event.data),
          email: primaryEmailOf(event.data),
        });
      }
    } catch {
      await ctx.runMutation(internal.account.releaseWebhookEvent, { eventId });
      return new Response("Webhook processing failed.", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  }),
});

export default http;
