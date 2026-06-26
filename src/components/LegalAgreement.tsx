import { FileCheck2, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";

export type AgreementKind = "terms" | "privacy";

interface AgreementSection {
  title: string;
  body: string;
  items?: string[];
}

const updatedAt = "June 27, 2026";

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
      "These Terms govern access to ChemVault User Center and connected ChemVault services, including account identity, permissions, mail identity, file, model, extract, molecule, notification, API, and admin surfaces. By creating, accessing, or using a ChemVault account, you agree to these Terms and any service-specific policies that apply to the ChemVault service you use.",
    sections: [
      {
        title: "1. Acceptance, scope, and account authority",
        body:
          "ChemVault User Center is the primary identity, permission, mail-account, and administrator console for the ChemVault ecosystem. These Terms apply to direct use of User Center and to authorization decisions consumed by ChemVault subdomains and connected services.",
        items: [
          "If you use ChemVault on behalf of a laboratory, university, company, team, or other organization, you represent that you have authority to use the service under that organization's policies.",
          "Service-specific interfaces may add operational rules for files, mailboxes, model runs, chemical extraction, notification delivery, API usage, and administrative workflows.",
          "If you do not agree to these Terms, do not create an account or continue using ChemVault services.",
        ],
      },
      {
        title: "2. Eligibility, registration, and human verification",
        body:
          "Email-based self-registration may require Cloudflare Turnstile human verification or another verification mechanism before an account is created. ChemVault may refuse, rate-limit, delay, or revoke registrations that appear automated, abusive, fraudulent, or inconsistent with platform policy.",
        items: [
          "You must provide accurate registration information, including a valid email address and truthful profile details where requested.",
          "You may not create accounts through bots, scripts, credential stuffing, disposable abuse patterns, or other automated means unless ChemVault has expressly authorized an integration.",
          "ChemVault may require additional verification for high-risk registrations, privileged roles, mail-account assignment, or administrator access.",
        ],
      },
      {
        title: "3. Credentials, sessions, and external sign-in",
        body:
          "You are responsible for protecting your password, Apple Account, ChemVault Mail SSO access, session cookies, devices, and any future authentication factors connected to your account.",
        items: [
          "Do not share credentials, session tokens, verification codes, administrator invites, or SSO assertions with unauthorized users.",
          "Notify a ChemVault administrator if you believe your account, mailbox, Apple Account link, or device session has been compromised.",
          "ChemVault may revoke sessions, require password changes, unlink external identities, or temporarily block access when needed to protect the system.",
        ],
      },
      {
        title: "4. Acceptable research and operational use",
        body:
          "ChemVault services are intended for lawful research, education, scientific workflow support, account administration, and related operational use.",
        items: [
          "You must not upload, generate, transmit, or request illegal, infringing, malicious, deceptive, privacy-invasive, or unauthorized content.",
          "You must not attack, probe, overload, scrape, reverse engineer, bypass, or interfere with ChemVault infrastructure, Cloudflare security controls, access controls, admin tooling, or other users.",
          "You must comply with applicable laboratory, institutional, export-control, safety, privacy, intellectual-property, and data-handling rules that apply to your work.",
        ],
      },
      {
        title: "5. Scientific, AI, extraction, and model output limitations",
        body:
          "ChemVault may provide AI extraction, model, molecule, search, and document-processing features. These tools are workflow aids and may be incomplete, inaccurate, delayed, or unsuitable for safety-critical decisions.",
        items: [
          "You are responsible for independently reviewing chemical, biological, medical, material-science, regulatory, safety, and experimental outputs before relying on them.",
          "ChemVault does not provide medical, legal, regulatory, hazardous-materials, or professional safety advice through automated output.",
          "Do not use ChemVault output as the sole basis for clinical, safety, compliance, manufacturing, patent, publication, or high-impact decisions.",
        ],
      },
      {
        title: "6. User content, uploads, and data responsibility",
        body:
          "You remain responsible for files, prompts, profile text, mailbox aliases, metadata, API inputs, model inputs, extracted content, and other materials submitted through your account.",
        items: [
          "You represent that you have the rights and permissions needed to submit content to ChemVault and to allow ChemVault to process it for the requested service.",
          "Do not submit confidential, regulated, personal, export-controlled, or third-party proprietary data unless you have authority and the relevant ChemVault service is appropriate for that data.",
          "ChemVault may process, store, transform, index, cache, and transmit submitted content as needed to provide services, enforce permissions, maintain audit records, and secure the platform.",
        ],
      },
      {
        title: "7. Permissions, roles, mailboxes, and administrator control",
        body:
          "Access to pages, APIs, mailboxes, files, models, service dashboards, and admin tools is controlled by ChemVault's role and permission systems.",
        items: [
          "Administrators may grant, deny, suspend, modify, audit, or revoke account roles, page access, service access, mailbox assignment, aliases, quotas, API permissions, and admin privileges.",
          "Owner and super-admin privileges may be protected from downgrade, deletion, or modification by ordinary administrators.",
          "Mailbox access, sending rights, receiving rights, aliases, and quotas are administrative assignments, not guaranteed entitlements.",
        ],
      },
      {
        title: "8. Audit logs, monitoring, and abuse prevention",
        body:
          "ChemVault may create and retain operational records to protect accounts, enforce permissions, investigate misuse, meet administrative requirements, and maintain reliable service.",
        items: [
          "Records may include login events, session metadata, IP-derived request metadata, user agent strings, permission changes, mailbox assignments, admin actions, API calls, usage counters, and access-check decisions.",
          "ChemVault may use Cloudflare services, including Turnstile and edge security products, to detect abuse and verify human registration.",
          "Attempting to disable, falsify, flood, or bypass logging, verification, or rate-limiting controls is prohibited.",
        ],
      },
      {
        title: "9. Plans, billing, quotas, and commercial features",
        body:
          "Free, Pro, Team, API, storage, mailbox, and AI-usage plan features may be introduced, changed, limited, or discontinued over time.",
        items: [
          "Usage limits, credits, storage quotas, mailbox quotas, rate limits, and access to premium features may depend on account role, plan, organization, or administrator policy.",
          "Future Stripe or billing integrations may have additional checkout, renewal, cancellation, tax, refund, and payment terms.",
          "A feature labeled preview, beta, coming soon, reserved, mock, or experimental may change before production availability.",
        ],
      },
      {
        title: "10. Third-party services and integrations",
        body:
          "ChemVault may integrate with Cloudflare, Apple, ChemVault Mail, Stripe, storage providers, AI providers, analytics, and other infrastructure or identity services.",
        items: [
          "Third-party services may have their own terms, privacy policies, reliability limits, and regional availability.",
          "ChemVault is not responsible for third-party service outages, policy changes, account restrictions, or authentication decisions outside ChemVault's control.",
          "You must not use integrations to bypass ChemVault permissions or third-party platform rules.",
        ],
      },
      {
        title: "11. Intellectual property and feedback",
        body:
          "ChemVault software, branding, interfaces, documentation, permission models, and service designs are owned by ChemVault or its licensors. These Terms do not transfer ownership of ChemVault intellectual property to you.",
        items: [
          "You may not copy, resell, sublicense, remove notices from, or misuse ChemVault branding, source code, APIs, UI, or documentation except as expressly allowed.",
          "If you submit ideas, bug reports, feature requests, or feedback, ChemVault may use them without restriction or compensation, while respecting applicable confidentiality obligations.",
        ],
      },
      {
        title: "12. Suspension, deletion, and termination",
        body:
          "ChemVault may suspend, disable, restrict, soft-delete, or terminate accounts or service access when required for security, abuse prevention, legal compliance, user request, system integrity, or administrator policy.",
        items: [
          "Deleted accounts may remain as soft-deleted records where needed for audit, security, fraud prevention, dispute handling, or legal obligations.",
          "Terminating an account may not immediately remove backups, logs, derived security records, or records held by connected services.",
          "ChemVault may preserve evidence of misuse, administrator actions, or access-control decisions after account termination.",
        ],
      },
      {
        title: "13. Disclaimers, availability, and changes",
        body:
          "ChemVault is provided on an as-is and as-available basis to the maximum extent allowed by applicable law. ChemVault does not guarantee uninterrupted availability, error-free output, permanent storage, compatibility with every workflow, or that every feature will remain available.",
        items: [
          "Maintenance, Cloudflare incidents, third-party outages, software defects, security events, migrations, quota enforcement, and policy changes may affect service availability.",
          "ChemVault may update these Terms, product behavior, access rules, UI, APIs, quotas, and integrations as the system evolves.",
        ],
      },
      {
        title: "14. Liability, indemnity, and disputes",
        body:
          "To the maximum extent allowed by applicable law, ChemVault's liability for claims related to the service is limited, and ChemVault is not responsible for indirect, incidental, consequential, special, punitive, or lost-profit damages. You agree to be responsible for claims arising from your misuse of the service, unlawful content, unauthorized access, or violation of these Terms.",
        items: [
          "Some jurisdictions do not allow certain limitations, so parts of this section may not apply to you.",
          "Any governing-law, venue, arbitration, class-action, or institutional contracting language should be finalized by counsel before production legal reliance.",
        ],
      },
      {
        title: "15. Contact and administrative questions",
        body:
          "Questions about access, roles, permissions, mailboxes, account deletion, billing readiness, or these Terms should be directed to a ChemVault administrator or the official ChemVault contact channel published for your organization or service.",
      },
    ],
  },
  privacy: {
    title: "ChemVault Privacy Policy",
    eyebrow: "Identity and access data policy",
    icon: ShieldCheck,
    intro:
      "This Privacy Policy explains how ChemVault User Center handles account, identity, access, security, and service-usage data across the ChemVault ecosystem. It applies to User Center and to connected ChemVault services that rely on User Center for authentication, permissions, mail-account binding, audit, and access checks.",
    sections: [
      {
        title: "1. Information we collect from you",
        body:
          "ChemVault may collect information that you provide directly when registering, signing in, completing a profile, requesting access, binding a mailbox, or using connected services.",
        items: [
          "Account details such as name, email address, avatar, institution, university, organization, field of interest, bio, website, GitHub link, role, system role, source, and account status.",
          "Security and authentication information such as password hashes, session records, token hashes, external identity links, Apple Account metadata, ChemVault Mail SSO metadata, and login timestamps.",
          "Administrative data such as permissions, page access, service access, mailbox assignment, aliases, mailbox quota, admin notes, and status changes.",
        ],
      },
      {
        title: "2. Content and service data",
        body:
          "Depending on the ChemVault services you use, ChemVault may process files, extraction inputs, molecules, model inputs, API requests, documents, prompts, metadata, generated outputs, mailbox configuration, and connected-service activity.",
        items: [
          "Content may be stored, indexed, transformed, or transmitted as needed to provide requested service functionality.",
          "Usage summaries may include AI extraction credits, API request counts, storage usage, service access status, and feature activity.",
          "Do not submit sensitive regulated data unless you have authority and the relevant ChemVault deployment is approved for that data type.",
        ],
      },
      {
        title: "3. Verification, cookies, and anti-abuse signals",
        body:
          "ChemVault uses security technologies to authenticate users, prevent abuse, protect accounts, and reduce automated registration.",
        items: [
          "User Center uses httpOnly cookies for session management and stores only session token hashes in the database.",
          "Email self-registration may use Cloudflare Turnstile. Cloudflare may process challenge tokens, IP-derived request metadata, browser signals, and anti-abuse telemetry according to Cloudflare's policies.",
          "ChemVault may record user agent strings, IP-derived metadata, request timestamps, failed login attempts, verification failures, and rate-limit signals for security purposes.",
        ],
      },
      {
        title: "4. How we use information",
        body:
          "ChemVault uses account and service data to operate the platform, authenticate users, enforce access controls, provide services, secure infrastructure, investigate misuse, and support administrative governance.",
        items: [
          "To create and maintain main accounts, sessions, profiles, roles, permissions, service access, page access, and mail-account bindings.",
          "To validate whether a user may access pages, APIs, files, documents, models, mail, extract, molecule, notif, admin, or other ChemVault services.",
          "To detect abuse, enforce Terms, debug issues, prevent unauthorized access, maintain audit trails, and respond to user or administrator requests.",
        ],
      },
      {
        title: "5. Sharing with ChemVault services and administrators",
        body:
          "User Center is designed to share limited identity and permission information with other ChemVault services so they can make authorization decisions.",
        items: [
          "Connected services may receive account id, email, name, role, system role, status, permission keys, service access, page access, and mail-account status when needed.",
          "Administrators may view and update user data, permissions, role assignments, mailbox settings, usage summaries, and audit logs according to their admin privileges.",
          "ChemVault does not intentionally expose password hashes, session tokens, token hashes, Apple private keys, JWT secrets, mail-system secrets, or other secrets through user-facing APIs.",
        ],
      },
      {
        title: "6. Third-party processors and integrations",
        body:
          "ChemVault may use infrastructure and integration providers to operate authentication, hosting, storage, security, payment readiness, and SSO features.",
        items: [
          "Cloudflare may provide Pages, Workers or Pages Functions, D1, R2, Turnstile, edge security, logs, and related infrastructure.",
          "Apple may process data when you use Apple Account sign-in. ChemVault Mail may process data when mail SSO or mailbox binding is used.",
          "Future billing features may use Stripe or another payment processor and may involve separate payment and tax data handling.",
        ],
      },
      {
        title: "7. Retention and deletion",
        body:
          "ChemVault keeps account, security, audit, and operational records for as long as needed to provide services, comply with obligations, resolve disputes, prevent abuse, and maintain platform integrity.",
        items: [
          "Profile fields may be updated by the user or an administrator where the interface allows.",
          "Account deletion is generally implemented as soft deletion, meaning the account is marked deleted and login is blocked while certain records may remain.",
          "Audit logs, security events, permission history, mailbox assignments, and access-control records may be retained after deletion when needed for security, compliance, or dispute handling.",
        ],
      },
      {
        title: "8. Security safeguards",
        body:
          "ChemVault uses technical and administrative safeguards intended to reduce unauthorized access, credential exposure, and accidental data disclosure.",
        items: [
          "Passwords are hashed before storage. Session cookies are httpOnly. Session token hashes, not raw session tokens, are stored in the database.",
          "Role checks, permission checks, page access, service access, admin guards, soft deletion, and audit logs are used to control and monitor access.",
          "No system is perfectly secure. Users must protect credentials, use trusted devices, and report suspected compromise promptly.",
        ],
      },
      {
        title: "9. International access and institutional requirements",
        body:
          "ChemVault may be accessed from multiple regions and may rely on global infrastructure providers. Users are responsible for following their institutional, contractual, export-control, privacy, and data-localization obligations before submitting data.",
        items: [
          "If your organization requires a data processing agreement, institutional contract, regional restriction, or special retention policy, do not upload restricted data until those requirements are approved.",
          "ChemVault administrators may configure access to reduce risk, but users remain responsible for choosing appropriate data for the environment.",
        ],
      },
      {
        title: "10. Your choices and rights",
        body:
          "Depending on your location, organization, and applicable law, you may have rights to access, correct, export, restrict, or delete certain personal information.",
        items: [
          "You can update many profile fields in User Center.",
          "You can request account deletion or restoration through available controls or a ChemVault administrator.",
          "Some requests may be limited where retention is required for security, legal, audit, fraud-prevention, backup, or dispute-resolution reasons.",
        ],
      },
      {
        title: "11. Children and sensitive users",
        body:
          "ChemVault is intended for research, education, and organizational workflows, not for unsupervised use by children. Users should not create accounts or submit data if they are not permitted to do so under applicable law or institutional policy.",
      },
      {
        title: "12. Changes and contact",
        body:
          "ChemVault may update this Privacy Policy as the account system, services, security controls, and integrations evolve. Questions about privacy, deletion, permissions, SSO, mailbox assignments, or data handling should be directed to a ChemVault administrator or the official contact channel for your organization or service.",
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
            {section.items?.length ? (
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <footer className="legal-document-note">
        This operational platform agreement is intended to reduce ambiguity for ChemVault users and administrators. It
        should be reviewed by qualified counsel before being treated as final legal advice or relied upon for a formal
        commercial launch.
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
