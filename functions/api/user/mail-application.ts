import { requireUser } from "../../_shared/auth";
import { loadUserMailAccount, writeAuditLog } from "../../_shared/permissions";
import { ApiError, handleApi, jsonResponse, readJson } from "../../_shared/responses";
import type { Env, UserRow } from "../../_shared/types";
import { normalizeEmail, validateEmail } from "../../_shared/validators";

const mailDomain = "chemvault.science";
const emailSendEndpoint = "https://api.cloudflare.com/client/v4/accounts";

interface CloudflareEmailResponse {
  success?: boolean;
  errors?: { code?: number; message?: string }[];
  result?: {
    delivered?: string[];
    queued?: string[];
    permanent_bounces?: string[];
  } | null;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeRequestedMailAddress(value: unknown): string {
  const raw = cleanText(value, 120).toLowerCase();
  const address = raw.includes("@") ? normalizeEmail(raw) : normalizeEmail(`${raw}@${mailDomain}`);
  if (!validateEmail(address)) {
    throw new ApiError("VALIDATION_ERROR", "A valid requested mailbox is required.", 400);
  }
  if (!address.endsWith(`@${mailDomain}`)) {
    throw new ApiError("VALIDATION_ERROR", `Requested mailbox must use @${mailDomain}.`, 400);
  }
  return address;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function applicationText(input: {
  user: UserRow;
  requestedMailAddress: string;
  displayName: string;
  reason: string;
  request: Request;
  now: string;
}) {
  return [
    "New ChemVault mailbox application",
    "",
    `Requested mailbox: ${input.requestedMailAddress}`,
    `Requested display name: ${input.displayName || input.user.name}`,
    "",
    "Applicant",
    `User ID: ${input.user.id}`,
    `Name: ${input.user.name}`,
    `Login email: ${input.user.email}`,
    `Source: ${input.user.source}`,
    `Role: ${input.user.role}`,
    `System role: ${input.user.system_role}`,
    `Institution: ${input.user.institution || "-"}`,
    `Field of interest: ${input.user.field_of_interest || "-"}`,
    "",
    "Reason",
    input.reason || "-",
    "",
    "Request metadata",
    `Requested at: ${input.now}`,
    `IP: ${input.request.headers.get("cf-connecting-ip") || "-"}`,
    `User agent: ${input.request.headers.get("user-agent") || "-"}`,
  ].join("\n");
}

function applicationHtml(input: {
  user: UserRow;
  requestedMailAddress: string;
  displayName: string;
  reason: string;
  request: Request;
  now: string;
}) {
  const row = (label: string, value: string) =>
    `<tr><th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#334155">${escapeHtml(label)}</th><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a">${escapeHtml(value)}</td></tr>`;

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="font-size:20px;margin:0 0 12px">New ChemVault mailbox application</h1>
      <p style="margin:0 0 18px;color:#475569">A ChemVault user requested a @chemvault.science mailbox from User Center.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;border:1px solid #e2e8f0">
        ${row("Requested mailbox", input.requestedMailAddress)}
        ${row("Requested display name", input.displayName || input.user.name)}
        ${row("User ID", input.user.id)}
        ${row("Name", input.user.name)}
        ${row("Login email", input.user.email)}
        ${row("Source", input.user.source)}
        ${row("Role", input.user.role)}
        ${row("System role", input.user.system_role)}
        ${row("Institution", input.user.institution || "-")}
        ${row("Field of interest", input.user.field_of_interest || "-")}
        ${row("Requested at", input.now)}
        ${row("IP", input.request.headers.get("cf-connecting-ip") || "-")}
        ${row("User agent", input.request.headers.get("user-agent") || "-")}
      </table>
      <h2 style="font-size:15px;margin:18px 0 8px">Reason</h2>
      <p style="white-space:pre-wrap;margin:0;padding:12px;border:1px solid #e2e8f0;background:#f8fafc">${escapeHtml(input.reason || "-")}</p>
    </div>
  `;
}

async function sendApplicationEmail(
  env: Env,
  input: {
    to: string;
    from: string;
    replyTo: string;
    subject: string;
    text: string;
    html: string;
  },
) {
  const accountId = env.CLOUDFLARE_EMAIL_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_EMAIL_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new ApiError("SSO_NOT_CONFIGURED", "Cloudflare Email Sending REST API is not configured.", 501);
  }

  const response = await fetch(`${emailSendEndpoint}/${encodeURIComponent(accountId)}/email/sending/send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: input.to,
      from: { address: input.from, name: "ChemVault User Center" },
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  const body = (await response.json().catch(() => null)) as CloudflareEmailResponse | null;
  if (!response.ok || !body?.success) {
    const message = body?.errors?.[0]?.message || `Cloudflare Email Sending failed with ${response.status}.`;
    throw new ApiError("INTERNAL_ERROR", message, 502);
  }
  return body.result || {};
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const existing = await loadUserMailAccount(env.DB, user.id);
    if (existing) {
      throw new ApiError("VALIDATION_ERROR", "This account already has a ChemVault mailbox.", 409);
    }

    const payload = (await readJson(request)) as {
      requestedMailAddress?: unknown;
      displayName?: unknown;
      reason?: unknown;
    };
    const requestedMailAddress = normalizeRequestedMailAddress(payload.requestedMailAddress);
    const displayName = cleanText(payload.displayName, 120) || user.name;
    const reason = cleanText(payload.reason, 1200);
    if (!reason || reason.length < 12) {
      throw new ApiError("VALIDATION_ERROR", "Please include a short reason for the mailbox request.", 400);
    }

    const duplicate = await env.DB.prepare(`SELECT id FROM mail_accounts WHERE mail_address = ? AND mail_status != 'deleted' LIMIT 1`)
      .bind(requestedMailAddress)
      .first<{ id: string }>();
    if (duplicate) {
      throw new ApiError("VALIDATION_ERROR", "This mailbox is already assigned.", 409);
    }

    const now = new Date().toISOString();
    const to = env.MAIL_APPLICATION_TO || "it.apply@chemvault.science";
    const from = env.MAIL_APPLICATION_FROM || "no-reply@chemvault.science";
    const subject = `ChemVault mailbox application: ${requestedMailAddress}`;
    const emailInput = { user, requestedMailAddress, displayName, reason, request, now };

    const delivery = await sendApplicationEmail(env, {
      to,
      from,
      replyTo: user.email,
      subject,
      text: applicationText(emailInput),
      html: applicationHtml(emailInput),
    });

    await writeAuditLog({
      env,
      request,
      actorUserId: user.id,
      targetUserId: user.id,
      action: "mail_application.request",
      resourceType: "mail_application",
      resourceId: requestedMailAddress,
      details: { requestedMailAddress, sentTo: to, displayName },
    });

    return jsonResponse(request, { ok: true, requestedMailAddress, sentTo: to, delivery });
  });
