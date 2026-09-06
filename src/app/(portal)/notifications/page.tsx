"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  LoadingList,
  PageHeader,
} from "@/components/ui";

export default function NotificationsPage() {
  const items = useQuery(api.notifications.list);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unread = items?.filter((i) => !i.read).length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description="Everything that has happened on the reports and projects you are part of."
        actions={
          unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => markAllRead()}>
              Mark all {unread} read
            </Button>
          ) : undefined
        }
      />

      {items === undefined && <LoadingList rows={3} />}

      {items?.length === 0 && (
        <EmptyState
          title="Nothing yet"
          description="You will hear from us when a report you made moves forward, or when a project you are on changes."
        />
      )}

      <div className="flex flex-col gap-3">
        {items?.map((item) => (
          <Card key={item._id} className={item.read ? undefined : "border-primary/25"}>
            <CardBody className="flex flex-col gap-2 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">{item.title}</h2>
                <div className="flex items-center gap-3">
                  {!item.read && <Badge tone="primary">New</Badge>}
                  <time className="font-mono text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>
              <p className="max-w-[65ch] text-sm text-muted-foreground">{item.body}</p>
              {item.link && (
                <Link
                  href={item.link}
                  className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open
                </Link>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
