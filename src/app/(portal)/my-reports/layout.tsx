import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My reports",
  description:
    "Everything you have sent in, and where each one has got to.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
