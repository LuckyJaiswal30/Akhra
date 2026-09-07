"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  LoadingList,
  Page,
  PageHeader,
} from "@/components/ui";
import { formatDateTime, machineDateTime } from "@/lib/datetime";

export default function NotificationsPage() {
  const items = useQuery(api.notifications.list);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const unread = items?.filter((i) => !i.read).length ?? 0;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Page width="column">
      <PageHeader
        title="Updates"
        description="Everything that has happened on the reports and projects you are involved in. Times are shown in IST."
        actions={
          unread > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              loading={busy}
              onClick={async () => {
                setError(null);
                setBusy(true);
                try {
                  await markAllRead();
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not mark those read.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Mark all {unread} read
            </Button>
          ) : undefined
        }
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {items === undefined && <LoadingList rows={3} />}

      {items?.length === 0 && (
        <EmptyState
          title="Nothing to tell you yet"
          description="We will let you know the moment a report you sent in moves forward, or something changes on a project you are on."
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
                  <time
                    dateTime={machineDateTime(item.createdAt)}
                    className="text-sm text-muted-foreground"
                  >
                    {formatDateTime(item.createdAt)}
                  </time>
                </div>
              </div>
              <p className="text-base text-muted-foreground">{item.body}</p>
              {item.link && (
                <Link
                  href={item.link}
                  className="w-fit text-base font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open
                </Link>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </Page>
  );
}
