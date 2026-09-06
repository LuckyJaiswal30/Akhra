"use client";

import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card } from "@/components/kit";

export default function NotificationsPage() {
  const items = useQuery(api.notifications.list);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unread = items?.filter((item) => !item.read).length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Updates" title="Notifications">
        <p>Everything that has happened on the reports and projects you touch.</p>
      </PageHeader>

      {unread > 0 && (
        <div>
          <Button variant="ghost" onClick={() => markAllRead()}>
            Mark all {unread} as read
          </Button>
        </div>
      )}

      {items?.length === 0 && (
        <Card>
          <p className="text-muted-foreground">Nothing yet.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {items?.map((item) => (
          <Card key={item._id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{item.title}</h2>
              <div className="flex items-center gap-3">
                {!item.read && <Badge tone="go">New</Badge>}
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <p className="max-w-[65ch] text-sm text-muted-foreground">
              {item.body}
            </p>
            {item.link && (
              <Link
                href={item.link}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
