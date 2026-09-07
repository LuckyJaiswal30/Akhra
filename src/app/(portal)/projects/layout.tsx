import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our projects",
  description:
    "Teams, plans and milestones at your institution.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
