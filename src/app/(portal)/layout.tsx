import { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { UserBootstrap } from "@/components/user-bootstrap";
import { PortalShell } from "@/components/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  await auth.protect();

  return (
    <>
      <UserBootstrap />
      <PortalShell>{children}</PortalShell>
    </>
  );
}
