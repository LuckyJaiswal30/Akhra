import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site map",
  description:
    "Every page on Akhra.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
