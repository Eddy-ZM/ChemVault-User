import { useEffect, useMemo, useState } from "react";
import { Ban, Check, CircleDashed, RotateCcw, Save, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ApiClientError, apiRequest } from "../lib/api";
import {
  getCategoryDisplay,
  getPermissionDependency,
  getPermissionDisplay,
  permissionSearchText,
  sortPermissionCategories,
  type PermissionDependency,
} from "../lib/permissionDisplay";
import type { PermissionDefinition, PermissionEffect, PermissionGrant } from "../lib/types";
import { ButtonSpinner, LoadingBlock, SaveBar } from "../components/UiPrimitives";
import { useToast } from "../components/Toast";

type LocalEffect = PermissionEffect | "inherit";

interface PermissionState {
  permissionAllowed: boolean;
  usable: boolean;
  dependency: PermissionDependency | null;
  dependencyAllowed: boolean;
  label: string;
  tone: "allow" | "deny" | "warning";
}

interface PermissionEditorResponse {
  userId: string;
  systemRole: string;
  permissions: PermissionGrant[];
  rolePermissions: PermissionGrant[];
  effectivePermissions: string[];
  definitions: PermissionDefinition[];
}

export function UserPermissionEditor() {
  const { id } = useParams();
  const { notify } = useToast();
  const [data, setData] = useState<PermissionEditorResponse | null>(null);
  const [draft, setDraft] = useState<Record<string, LocalEffect>>({});
  const [savedDraft, setSavedDraft] = useState<Record<string, LocalEffect>>({});
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const body = await apiRequest<PermissionEditorResponse>(`/api/admin/users/${id}/permissions`);
      const nextDraft = Object.fromEntries(body.permissions.map((grant) => [grant.key, grant.effect as LocalEffect]));
      setData(body);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setError("");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Permissions failed to load.";
      setError(message);
      notify({ title: "Permissions failed to load", description: message, tone: "error" });
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDefinition[]>();
    const needle = query.trim().toLowerCase();
    for (const item of data?.definitions || []) {
      if (needle && !permissionSearchText(item).toLowerCase().includes(needle)) continue;
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()].sort(sortPermissionCategories);
  }, [data, query]);

  async function save() {
    if (!id) return;
    setSaving(true);
    const permissions = Object.entries(draft)
      .filter(([, effect]) => effect === "allow" || effect === "deny")
      .map(([key, effect]) => ({ key, effect }));
    try {
      const body = await apiRequest<PermissionEditorResponse>(`/api/admin/users/${id}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      });
      const nextDraft = Object.fromEntries(body.permissions.map((grant) => [grant.key, grant.effect as LocalEffect]));
      setData((current) => current ? { ...current, ...body } : body);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setMessage("Permissions saved.");
      notify({ title: "Permissions saved", tone: "success" });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Permission save failed.";
      notify({ title: "Permission save failed", description: message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function setEffect(key: string, effect: LocalEffect) {
    setDraft((current) => ({ ...current, [key]: effect }));
    setMessage("");
  }

  function setCategoryEffect(category: string, effect: LocalEffect) {
    if (!data) return;
    const keys = data.definitions.filter((definition) => definition.category === category).map((definition) => definition.key);
    setDraft((current) => ({
      ...current,
      ...Object.fromEntries(keys.map((key) => [key, effect])),
    }));
    setMessage("");
  }

  function resetDraft() {
    setDraft(savedDraft);
    setMessage("");
  }

  if (error) return <section className="page-section"><div className="alert-error">{error}</div></section>;
  if (!data) return <section className="page-section"><LoadingBlock label="Loading permissions..." /></section>;

  const effective = new Set(data.effectivePermissions);
  const roleEffects = new Map(data.rolePermissions.map((grant) => [grant.key, grant.effect]));
  const previewEffective = getPreviewEffectivePermissions(data.definitions, data.systemRole, data.rolePermissions, draft, effective);
  const states = new Map(data.definitions.map((definition) => [definition.key, getAccessState(definition, previewEffective)]));
  const directAllows = Object.values(draft).filter((effect) => effect === "allow").length;
  const directDenies = Object.values(draft).filter((effect) => effect === "deny").length;
  const usableCount = [...states.values()].filter((state) => state.usable).length;
  const serviceBlockedCount = [...states.values()].filter(
    (state) => state.permissionAllowed && !state.dependencyAllowed,
  ).length;
  const dirtyCount = new Set([...Object.keys(draft), ...Object.keys(savedDraft)]).size
    ? [...new Set([...Object.keys(draft), ...Object.keys(savedDraft)])].filter((key) => (draft[key] || "inherit") !== (savedDraft[key] || "inherit")).length
    : 0;

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">User Permission Editor</p>
          <h1>Direct permissions</h1>
          <p className="text-sm text-slate-500">
            System role defaults are used unless you explicitly allow or deny a permission here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-button" onClick={resetDraft} disabled={!dirtyCount || saving}><RotateCcw className="h-4 w-4" />Reset</button>
          <button type="button" className="primary-button" onClick={() => void save()} disabled={!dirtyCount || saving}>
            {saving ? <ButtonSpinner label="Saving..." /> : <><Save className="h-4 w-4" />Save</>}
          </button>
        </div>
      </div>
      {message ? <div className="alert-success">{message}</div> : null}
      <div className="settings-panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-slate-400" />
            Search permissions
            <input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages, files, docs, admin actions..."
            />
          </label>
          <Link to={`/admin/users/${id}`} className="secondary-button">Back to user</Link>
        </div>
        <div className="permission-summary-grid">
          <div>
            <span>System role</span>
            <strong>{formatSystemRole(data.systemRole)}</strong>
          </div>
          <div>
            <span>Usable now</span>
            <strong>{usableCount}</strong>
          </div>
          <div>
            <span>Blocked by service</span>
            <strong>{serviceBlockedCount}</strong>
          </div>
          <div>
            <span>Direct allow</span>
            <strong>{directAllows}</strong>
          </div>
          <div>
            <span>Direct deny</span>
            <strong>{directDenies}</strong>
          </div>
        </div>
      </div>
      {serviceBlockedCount ? (
        <div className="permission-consistency-warning">
          {serviceBlockedCount} permission{serviceBlockedCount === 1 ? "" : "s"} are allowed by role or direct rules but are not usable
          because the required service access is blocked. Grant the service access first, or explicitly deny the dependent permissions.
        </div>
      ) : null}

      {grouped.map(([category, permissions]) => (
        <div key={category} className="settings-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{getCategoryDisplay(category).label}</h2>
              <p className="mt-1 text-sm text-slate-500">{getCategoryDisplay(category).description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["inherit", "allow", "deny"] as LocalEffect[]).map((effect) => (
                <button key={effect} className="secondary-button h-8 px-3 text-xs" type="button" onClick={() => setCategoryEffect(category, effect)}>
                  {categoryActionLabel(effect)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {permissions.map((permission) => {
              const effect = draft[permission.key] || "inherit";
              const display = getPermissionDisplay(permission);
              const state = states.get(permission.key) || getAccessState(permission, previewEffective);
              const sourceLabel = getSourceLabel(effect, roleEffects.get(permission.key));
              const canAllowDependency = state.dependency && data.definitions.some((definition) => definition.key === state.dependency?.permissionKey);
              return (
                <div
                  key={permission.key}
                  className={`permission-card permission-card-${state.tone}`}
                  data-permission-key={permission.key}
                  data-permission-state={state.tone}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3>{display.title}</h3>
                        <span className={`permission-outcome permission-outcome-${state.tone}`}>
                          {state.label}
                        </span>
                        <span className="badge-muted">{sourceLabel}</span>
                      </div>
                      <p>{display.summary}</p>
                      {state.dependency ? (
                        <div className={state.dependencyAllowed ? "permission-dependency permission-dependency-ok" : "permission-dependency permission-dependency-blocked"}>
                          <span>
                            Requires <strong>{state.dependency.label}</strong> service access.
                            {state.dependencyAllowed ? " Requirement satisfied." : " Requirement blocked."}
                          </span>
                          {!state.dependencyAllowed && canAllowDependency ? (
                            <button
                              className="secondary-button h-8 px-3 text-xs"
                              type="button"
                              onClick={() => setEffect(state.dependency!.permissionKey, "allow")}
                            >
                              Allow required service
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="permission-dependency permission-dependency-gate">
                          Service entry gate. Dependent pages and feature permissions require this first.
                        </div>
                      )}
                      <div className="permission-technical-key">Technical key: {permission.key}</div>
                    </div>
                    <div className="segmented">
                      {(["inherit", "allow", "deny"] as LocalEffect[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`segment-button ${effect === option ? `segment-active segment-${option}` : ""}`}
                          data-permission-option={option}
                          onClick={() => setEffect(permission.key, option)}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {option === "inherit" ? <CircleDashed className="h-3.5 w-3.5" /> : option === "allow" ? <Check className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            {effectLabel(option)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <SaveBar dirtyCount={dirtyCount} saving={saving} onReset={resetDraft} onSave={() => void save()} />
    </section>
  );
}

function effectLabel(effect: LocalEffect): string {
  if (effect === "inherit") return "Follow role";
  if (effect === "allow") return "Allow";
  return "Deny";
}

function categoryActionLabel(effect: LocalEffect): string {
  if (effect === "inherit") return "Set all to follow role";
  if (effect === "allow") return "Allow all";
  return "Deny all";
}

function formatSystemRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function getAccessState(permission: PermissionDefinition, effective: Set<string>): PermissionState {
  const permissionAllowed = effective.has(permission.key);
  const dependency = getPermissionDependency(permission);
  const dependencyAllowed = !dependency || effective.has(dependency.permissionKey);

  if (permissionAllowed && dependencyAllowed) {
    return {
      permissionAllowed,
      usable: true,
      dependency,
      dependencyAllowed,
      label: "Usable now",
      tone: "allow",
    };
  }

  if (permissionAllowed && !dependencyAllowed) {
    return {
      permissionAllowed,
      usable: false,
      dependency,
      dependencyAllowed,
      label: "Blocked by service access",
      tone: "warning",
    };
  }

  return {
    permissionAllowed,
    usable: false,
    dependency,
    dependencyAllowed,
    label: "Permission blocked",
    tone: "deny",
  };
}

function getPreviewEffectivePermissions(
  definitions: PermissionDefinition[],
  systemRole: string,
  rolePermissions: PermissionGrant[],
  draft: Record<string, LocalEffect>,
  savedEffective: Set<string>,
): Set<string> {
  if (systemRole === "owner" || systemRole === "super_admin") {
    return new Set(definitions.map((definition) => definition.key));
  }

  const preview = new Set<string>();
  for (const grant of rolePermissions) {
    if (grant.effect === "deny") {
      preview.delete(grant.key);
      continue;
    }
    if (grant.effect === "allow") preview.add(grant.key);
  }

  if (!rolePermissions.length) {
    for (const key of savedEffective) preview.add(key);
  }

  for (const [key, effect] of Object.entries(draft)) {
    if (effect === "deny") {
      preview.delete(key);
      continue;
    }
    if (effect === "allow") preview.add(key);
  }

  return preview;
}

function getSourceLabel(effect: LocalEffect, roleEffect?: PermissionEffect): string {
  if (effect === "allow") return "Direct allow";
  if (effect === "deny") return "Direct deny";
  if (roleEffect === "allow") return "Allowed by role";
  if (roleEffect === "deny") return "Denied by role";
  return "Follow role";
}
