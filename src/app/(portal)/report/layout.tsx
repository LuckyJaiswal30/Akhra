import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a problem",
  description:
    "Tell a district officer about a problem where you live. Six steps, one at a time.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
