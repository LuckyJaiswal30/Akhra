// Without Clerk keys the public site, anonymous reporting and the tracker still work; sign-in is off.
export const signInEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);
