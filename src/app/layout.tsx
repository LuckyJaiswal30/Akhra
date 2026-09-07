import type { Metadata, Viewport } from "next";
import { Bungee, Noto_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { AFTER_AUTH, AFTER_SIGN_OUT } from "@/lib/redirects";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Akhra — report a local problem in Jharkhand",
    template: "%s · Akhra",
  },
  description:
    "Report a problem where you live. A district officer checks it, a university team takes it on, and you are told when it is fixed.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl={AFTER_AUTH}
      signUpFallbackRedirectUrl={AFTER_AUTH}
      afterSignOutUrl={AFTER_SIGN_OUT}
      afterMultiSessionSingleSignOutUrl="/sign-in"
      appearance={{
        variables: {
          colorPrimary: "var(--primary)",
          colorPrimaryForeground: "var(--primary-foreground)",
          colorForeground: "var(--foreground)",
          colorMutedForeground: "var(--muted-foreground)",
          colorBackground: "var(--card)",
          colorInput: "var(--card)",
          colorInputForeground: "var(--foreground)",
          colorBorder: "var(--border)",
          colorDanger: "var(--danger)",
          colorSuccess: "var(--success)",
          colorWarning: "var(--warning)",
          colorRing: "var(--ring)",
          borderRadius: "var(--radius-sm)",
          fontFamily: "var(--font-noto-sans)",
        },
        elements: {
          footer: "!hidden",
          footerItem: "!hidden",
          userButtonPopoverFooter: "!hidden",
          logoBox: "!hidden",
        },
      }}
    >
      <html
        lang="en"
        className={`${notoSans.variable} ${bungee.variable} antialiased`}
      >
        <body className="flex min-h-dvh flex-col">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
