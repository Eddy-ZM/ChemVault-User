import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, MailPlus, RefreshCw, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { ServiceCard } from "../components/ServiceCard";
import { ApiClientError, apiRequest } from "../lib/api";
import type { ConnectedService } from "../lib/types";
import { ButtonSpinner, EmptyState, LoadingBlock, StatusBadge } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";
import { useAuth } from "../lib/auth";

export function ConnectedServices() {
  const { notify } = useToast();
  const { user } = useAuth();
  const [services, setServices] = useState<ConnectedService[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [mailAddress, setMailAddress] = useState("");
  const [mailDisplayName, setMailDisplayName] = useState("");
  const [mailReason, setMailReason] = useState("");
  const [mailApplying, setMailApplying] = useState(false);
  const [mailApplicationSent, setMailApplicationSent] = useState("");

  const defaultMailAddress = useMemo(() => {
    if (!user?.email) return "";
    return `${user.email.split("@")[0].replace(/[^a-z0-9._-]/gi, ".").toLowerCase()}@chemvault.science`;
  }, [user?.email]);

  async function load(showToast = false) {
    try {
      setLoading(true);
      const body = await apiRequest<{ services: ConnectedService[] }>("/api/user/services");
      setServices(body.services);
      if (showToast) notify({ title: "Services refreshed", tone: "success" });
    } catch (err) {
      notify({ title: "Services failed to load", description: err instanceof ApiClientError ? err.message : "Try again later.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setMailAddress(defaultMailAddress);
    setMailDisplayName(user?.name || "");
  }, [defaultMailAddress, user?.name]);

  async function applyForMailbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMailApplicationSent("");
    try {
      setMailApplying(true);
      const body = await apiRequest<{ ok: true; requestedMailAddress: string; sentTo: string }>("/api/user/mail-application", {
        method: "POST",
        body: JSON.stringify({
          requestedMailAddress: mailAddress,
          displayName: mailDisplayName,
          reason: mailReason,
        }),
      });
      setMailApplicationSent(`Request sent to ${body.sentTo} for ${body.requestedMailAddress}.`);
      setMailReason("");
      notify({ title: "Mailbox request sent", description: body.requestedMailAddress, tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Mailbox request failed.";
      notify({ title: "Mailbox request failed", description: message, tone: "error" });
    } finally {
      setMailApplying(false);
    }
  }

  const filtered = services.filter((service) => {
    const matchQuery = !query || `${service.name} ${service.description} ${service.service}`.toLowerCase().includes(query.toLowerCase());
    const matchStatus = !status || service.status === status;
    return matchQuery && matchStatus;
  });

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Connected Services</p>
          <h1>ChemVault product access</h1>
        </div>
        <button className="secondary-button" type="button" onClick={() => void load(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="settings-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search services
            <input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="files, extract, molecule..." />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="not_connected">Not connected</option>
              <option value="coming_soon">Coming soon</option>
            </select>
          </label>
        </div>
      </div>
      <div className="settings-panel">
        <div className="flex items-start gap-3">
          <div className="icon-tile">
            <MailPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">ChemVault mailbox</h2>
            <p className="mt-1 text-sm text-slate-500">
              Users who signed in through Apple Account, email registration, or external identity can request a
              @chemvault.science mailbox for review by ChemVault IT.
            </p>
          </div>
        </div>
        {user?.mailAccount ? (
          <div className="external-identity-card">
            <div>
              <p className="font-semibold text-slate-950">{user.mailAccount.mailAddress}</p>
              <p className="mt-1 text-sm text-slate-500">
                Mailbox is already bound to this ChemVault main account. Mail behavior follows the assigned Mail role.
              </p>
              <p className="mt-1 text-xs text-slate-500">Mail role: {user.mailAccount.mailRole}</p>
            </div>
            <StatusBadge value={user.mailAccount.mailStatus} />
          </div>
        ) : (
          <form className="mt-4 grid gap-4" onSubmit={applyForMailbox}>
            {mailApplicationSent ? <div className="alert-success">{mailApplicationSent}</div> : null}
            <div className="form-grid">
              <label>
                Requested mailbox
                <input
                  value={mailAddress}
                  onChange={(event) => setMailAddress(event.target.value)}
                  placeholder={defaultMailAddress || "name@chemvault.science"}
                  required
                />
              </label>
              <label>
                Mail display name
                <input value={mailDisplayName} onChange={(event) => setMailDisplayName(event.target.value)} placeholder={user?.name || "Display name"} />
              </label>
            </div>
            <label>
              Reason for request
              <textarea
                value={mailReason}
                onChange={(event) => setMailReason(event.target.value)}
                placeholder="Describe the project, team, or ChemVault service that needs this mailbox."
                rows={4}
                required
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-help">Requests are emailed to it.apply@chemvault.science for manual review.</p>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link className="secondary-button" to={`/onboarding/mail?returnTo=${encodeURIComponent("/services")}&provider=${encodeURIComponent(user?.source || "account")}`}>
                  <KeyRound className="h-4 w-4" />
                  Bind existing mailbox
                </Link>
                <button className="primary-button" type="submit" disabled={mailApplying}>
                  {mailApplying ? <ButtonSpinner label="Sending request..." /> : "Request mailbox"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
      {loading ? <LoadingBlock label="Loading services..." /> : null}
      <div className="service-grid">
        {filtered.map((service) => (
          <ServiceCard key={service.service} service={service} />
        ))}
      </div>
      {!loading && !filtered.length ? <EmptyState title="No services found" description="Adjust search or status filters to find services." /> : null}
    </section>
  );
}
