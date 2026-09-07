import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reports to check",
  description:
    "Reports waiting on an officer in your district.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
