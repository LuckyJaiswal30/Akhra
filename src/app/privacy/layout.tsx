import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What is stored, who can see it, and what reaches a model.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
