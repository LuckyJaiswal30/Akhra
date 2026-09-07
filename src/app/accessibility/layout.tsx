import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Our conformance statement and screen reader guidance.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
