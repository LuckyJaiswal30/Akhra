import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access",
  description:
    "Who holds which role, and who gave it to them.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
