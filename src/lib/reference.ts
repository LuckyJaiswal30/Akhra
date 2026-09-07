import { yearIn } from "./datetime";

export function referenceFor(id: string, createdAt: number): string {
  const tail = id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  return `JH/${yearIn(createdAt)}/${tail}`;
}
