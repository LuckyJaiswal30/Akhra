import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What we backed",
  description:
    "What your organisation has put its name to.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
