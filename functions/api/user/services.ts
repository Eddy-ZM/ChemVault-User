import { requireUser } from "../../_shared/auth";
import { handleApi, jsonResponse } from "../../_shared/responses";
import type { Env } from "../../_shared/types";

const serviceCatalog = [
  {
    service: "search",
    name: "ChemVault Search",
    description: "Search research-ready chemistry records and indexed project knowledge.",
  },
  {
    service: "extract",
    name: "ChemVault Extract",
    description: "Extract structured chemical data from papers, tables, and lab files.",
  },
  {
    service: "files",
    name: "ChemVault Files",
    description: "Store and organize user files, datasets, and extraction outputs.",
  },
  {
    service: "molecule",
    name: "ChemVault Molecule",
    description: "Manage molecule views, identifiers, and future molecular workflows.",
  },
  {
    service: "notif",
    name: "ChemVault Notif",
    description: "Receive workflow notifications and system updates across ChemVault.",
  },
] as const;

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) =>
  handleApi(request, async () => {
    const { user } = await requireUser(env, request);
    const rows = await env.DB.prepare(`SELECT service, status, created_at FROM connected_services WHERE user_id = ?`)
      .bind(user.id)
      .all<{ service: string; status: string; created_at: string }>();

    const statusByService = new Map((rows.results || []).map((row) => [row.service, row]));
    const services = serviceCatalog.map((entry) => ({
      ...entry,
      status: statusByService.get(entry.service)?.status || (entry.service === "molecule" ? "coming_soon" : "active"),
      connectedAt: statusByService.get(entry.service)?.created_at || null,
    }));

    return jsonResponse(request, { services });
  });
