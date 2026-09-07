import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposals",
  description:
    "University plans looking for industry backing.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
