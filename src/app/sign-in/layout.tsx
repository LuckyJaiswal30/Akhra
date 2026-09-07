import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Akhra with the email address you signed up with.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
