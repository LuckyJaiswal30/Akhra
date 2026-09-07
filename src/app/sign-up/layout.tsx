import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Make an account",
  description:
    "Make an Akhra account so you can report a problem and follow it.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
