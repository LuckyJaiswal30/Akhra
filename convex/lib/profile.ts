import { Doc } from "../_generated/dataModel";
import { isDistrict } from "./districts";

export type ProfileGap = "district" | "designation";

export function profileGaps(user: Doc<"users">): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!isDistrict(user.district)) gaps.push("district");
  if (!user.designation || user.designation.trim().length < 2) {
    gaps.push("designation");
  }
  return gaps;
}

export function isProfileComplete(user: Doc<"users">) {
  return profileGaps(user).length === 0;
}

export function assertCompleteProfile(user: Doc<"users">) {
  if (isProfileComplete(user)) return;
  throw new Error(
    "Your profile is not complete yet. Add your district and designation before doing this.",
  );
}
