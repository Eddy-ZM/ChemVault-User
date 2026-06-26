import { FileCheck2, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";

export type AgreementKind = "terms" | "privacy";

interface AgreementSection {
  title: string;
  body: string;
}

const updatedAt = "June 26, 2026";

const agreements: Record<
  AgreementKind,
  {
    title: string;
    eyebrow: string;
    icon: typeof FileCheck2;
    intro: string;
    sections: AgreementSection[];
  }
> = {
  terms: {
    title: "ChemVault Terms of Service",
    eyebrow: "Account authority agreement",
    icon: FileCheck2,
    intro:
      "These Terms govern access to ChemVault User Center and connected ChemVault services, including account identity, permissions, mail identity, file, model, extract, molecule, notification, and admin surfaces.",
    sections: [
      {
        title: "1. Account identity",
        body:
          "You are responsible for maintaining accurate account information, safeguarding your credentials, and keeping access limited to authorized users. ChemVault may suspend or restrict accounts that appear compromised, abusive, fraudulent, or non-compliant with system policy.",
      },
      {
        title: "2. Research and service use",
        body:
          "ChemVault services are intended for lawful research, education, internal operations, and scientific workflow support. You must not use the system to upload illegal content, attack services, bypass access controls, exfiltrate data, or interfere with other users or ChemVault infrastructure.",
      },
      {
        title: "3. Permissions and administrative control",
        body:
          "Access to ChemVault pages, APIs, mailboxes, files, models, and admin tools is controlled by the ChemVault Main Account System. Administrators may grant, modify, suspend, revoke, or audit permissions according to organizational and security requirements.",
      },
      {
        title: "4. User content and records",
        body:
          "You retain responsibility for content you submit to ChemVault. ChemVault may store operational records such as usage logs, audit logs, mail-account bindings, permission grants, and security events to operate and protect the platform.",
      },
      {
        title: "5. Availability and changes",
        body:
          "ChemVault may evolve features, limits, connected services, plans, and administrative policies over time. Preview, coming-soon, or reserved integrations such as billing, Stripe, or external SSO may change before production enablement.",
      },
      {
        title: "6. Termination",
        body:
          "Accounts may be disabled, suspended, or soft-deleted when required for security, compliance, user request, or administrative action. Some audit and operational records may be retained after account deletion where necessary to protect the system.",
      },
    ],
  },
  privacy: {
    title: "ChemVault Privacy Policy",
    eyebrow: "Identity and access data policy",
    icon: ShieldCheck,
    intro:
      "This Privacy Policy explains how ChemVault User Center handles account, identity, access, security, and service-usage data across the ChemVault ecosystem.",
    sections: [
      {
        title: "1. Information we collect",
        body:
          "ChemVault may collect account details such as name, email, avatar, institution, field of interest, profile text, website links, system role, account status, mail-account bindings, service access, page access, and permission grants.",
      },
      {
        title: "2. Authentication and security data",
        body:
          "We store password hashes, session records, token hashes, external identity links, SSO metadata, login timestamps, user agent data, and IP-derived request metadata where needed for authentication, security, auditing, and abuse prevention.",
      },
      {
        title: "3. Usage and audit records",
        body:
          "ChemVault may record service usage, API activity, storage usage, AI extraction credits, administrator actions, permission changes, mail-account assignments, and access-control decisions to operate and secure the platform.",
      },
      {
        title: "4. Connected services",
        body:
          "Connected ChemVault services may call User Center to verify identity and permissions. User Center returns only the account and access information needed for the requesting service to make authorization decisions.",
      },
      {
        title: "5. Data protection",
        body:
          "ChemVault uses httpOnly cookies, hashed sessions, password hashing, role and permission checks, soft deletion, and audit logs. Secrets such as JWT signing keys, SSO secrets, Apple private keys, and mail-system credentials must be stored outside the repository.",
      },
      {
        title: "6. Your choices",
        body:
          "You may update profile information in User Center, request account deletion where available, or contact a ChemVault administrator for access, mail-account, role, permission, or data-retention questions.",
      },
    ],
  },
};

export function AgreementContent({ kind }: { kind: AgreementKind }) {
  const agreement = agreements[kind];
  const Icon = agreement.icon;

  return (
    <article className="legal-document">
      <header className="legal-document-header">
        <div className="legal-document-seal">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="label">{agreement.eyebrow}</p>
          <h1>{agreement.title}</h1>
          <p>Last updated: {updatedAt}</p>
        </div>
      </header>
      <p className="legal-document-intro">{agreement.intro}</p>
      <div className="legal-document-sections">
        {agreement.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <footer className="legal-document-note">
        This document is an operational ChemVault platform agreement draft and should be reviewed by counsel before
        being treated as final legal advice.
      </footer>
    </article>
  );
}

export function AgreementModal({
  kind,
  open,
  onClose,
}: {
  kind: AgreementKind;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={agreements[kind].title} description={`Last updated: ${updatedAt}`} onClose={onClose} size="lg">
      <AgreementContent kind={kind} />
    </Modal>
  );
}

