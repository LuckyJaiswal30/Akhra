import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help",
  description:
    "How to report a problem, and what each status means.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
