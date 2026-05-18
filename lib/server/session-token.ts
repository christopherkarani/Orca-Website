import { createHash } from "node:crypto";

export function sessionStorageKey(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
