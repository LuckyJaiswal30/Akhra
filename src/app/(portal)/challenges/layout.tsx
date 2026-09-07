import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open challenges",
  description:
    "Problems an officer has confirmed and sent to your institution.",
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
