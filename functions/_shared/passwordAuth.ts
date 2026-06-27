import { loadUserMailAccount } from "./permissions";
import { verifyPassword } from "./security";
import type { Env, UserRow } from "./types";
import { verifyExternalPassword, verifyMailSystemPassword } from "./externalAuth";
import { normalizeEmail } from "./validators";

export async function verifyAccountPassword(
  env: Env,
  user: UserRow,
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (await verifyPassword(password, user.password_hash)) return true;
  if (await verifyExternalPassword(env.DB, user, password)) return true;

  const candidates = new Set([normalizeEmail(user.email)]);
  const mailAccount = await loadUserMailAccount(env.DB, user.id);
  if (mailAccount?.mailAddress) candidates.add(normalizeEmail(mailAccount.mailAddress));

  for (const email of candidates) {
    const mailAuth = await verifyMailSystemPassword(env, email, password, fetcher);
    if (mailAuth) return true;
  }

  return false;
}
