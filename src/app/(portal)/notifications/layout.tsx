import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Updates",
  description:
    "News about your reports and the projects you are on.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
