import { ApiError } from "./responses";
import type { UserRow } from "./types";

export type AuthenticationStatus = Pick<UserRow, "status" | "global_status">;

export function isUserActive(user: AuthenticationStatus): boolean {
  return user.status === "active" && user.global_status === "active";
}

export function assertUserCanAuthenticate(user: AuthenticationStatus | null): void {
  if (!user || isUserActive(user)) return;
  if (user.status === "deleted" || user.global_status === "deleted") {
    throw new ApiError("USER_DELETED", "This account has been deleted.", 403);
  }
  if (user.status === "deletion_pending" || user.global_status === "deletion_pending") {
    throw new ApiError("USER_DELETION_PENDING", "This account is being deleted and cannot sign in.", 403);
  }
  throw new ApiError("USER_DISABLED", "This account is not active.", 403);
}
