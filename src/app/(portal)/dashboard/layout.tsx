import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How it is going",
  description:
    "What has been reported across Jharkhand, and what has been dealt with.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
