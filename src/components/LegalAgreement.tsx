import { FileCheck2, ShieldCheck } from "lucide-react";
import { Modal } from "./Modal";

export type AgreementKind = "terms" | "privacy";

interface AgreementSection {
  title: string;
  paragraphs: string[];
  clauses?: string[];
}

interface AgreementDocument {
  title: string;
  eyebrow: string;
  icon: typeof FileCheck2;
  intro: string[];
  sections: AgreementSection[];
  closing: string;
}

const updatedAt = "July 8, 2026";

const agreements: Record<AgreementKind, AgreementDocument> = {
  terms: {
    title: "ChemVault Terms of Service",
    eyebrow: "Main account system agreement",
    icon: FileCheck2,
    intro: [
      "Draft only. This account-system terms text is not legal advice and must be reviewed by qualified counsel before commercial launch, enterprise contracting, regulated data processing, or public legal reliance.",
      "These draft Terms of Service describe the operational rules ChemVault intends to apply to individuals or entities that create, access, administer, or use a ChemVault account, ChemVault User Center, ChemVault Mail sign-in, Apple Account sign-in, or any connected ChemVault service that relies on the ChemVault main account system.",
      "ChemVault User Center at user.chemvault.science is the identity authority, permission center, mail-account control plane, and administrative console for the ChemVault ecosystem. These Terms apply to the main account system and to connected services, including ChemVault Search, Extract, Files, Docs, Model, Molecule, Notif, Mail, API surfaces, and administrator workflows.",
      "If you use ChemVault on behalf of a laboratory, university, research group, company, institution, team, or other organization, you represent that you are authorized to accept these Terms for that organization and that your use complies with the organization's internal policies, data rules, and security requirements.",
    ],
    sections: [
      {
        title: "1. Agreement, scope, and incorporated policies",
        paragraphs: [
          "By registering for, signing in to, accessing, or continuing to use ChemVault, you accept these Terms and any policies, notices, or service-specific terms presented in the product, published by ChemVault, or required by an administrator for your organization. If you do not agree, you must not create an account, authenticate through a connected identity provider, or use ChemVault services.",
          "These Terms govern account identity, profile data, authentication, role assignment, page access, service access, mailbox assignment, API access, usage limits, audit logging, and administrative control. A connected ChemVault service may display additional operational terms for a specific workflow, and those additional terms apply only to that service unless they expressly state otherwise.",
        ],
        clauses: [
          "If these Terms conflict with a written agreement signed by ChemVault for an institutional or enterprise deployment, the signed agreement controls for the conflicting subject matter and only for the account or organization covered by that agreement.",
          "ChemVault may use product notices, administrator notices, email notices, dashboard notices, or updated legal pages to communicate material changes, operational requirements, or security requirements.",
          "Headings are for convenience only and do not limit the meaning of any provision.",
        ],
      },
      {
        title: "2. Definitions",
        paragraphs: [
          "For purposes of these Terms, a Main Account is the primary ChemVault identity record associated with a user. A Mail Account is a mailbox or mail identity, such as a chemvault.science address or alias, that may be assigned to a Main Account. A Service is any ChemVault site, application, API, page, dashboard, storage location, workflow, or administrative surface connected to the main account system.",
          "User Content means files, documents, prompts, molecules, extracted text, model inputs, model outputs, API payloads, profile fields, mailbox configuration, aliases, comments, metadata, and any other material submitted, stored, generated, or transmitted through ChemVault by or for a user.",
        ],
        clauses: [
          "Permissions include page permissions, service permissions, file permissions, docs permissions, model permissions, API permissions, administrative permissions, and any custom permission key created by an administrator. Mail sending, receiving, and login are governed by ChemVault Mail role assignment.",
          "Administrator includes owner, super admin, admin, service admin, staff, or any user who is granted permissions to manage other users, access settings, services, mailboxes, audit logs, or system configuration.",
          "Account Status includes active, disabled, suspended, deleted, or any similar status that ChemVault uses to control access.",
        ],
      },
      {
        title: "3. Eligibility, account creation, and verification",
        paragraphs: [
          "You must provide accurate, current, and complete information when creating or updating a ChemVault account. You may not impersonate another person, misrepresent an affiliation, register accounts for abuse, or use disposable, deceptive, or unauthorized account information.",
          "ChemVault may require email verification, Cloudflare Turnstile, administrator approval, domain validation, Apple Account sign-in, ChemVault Mail SSO, or another authentication or verification step before permitting registration, login, privileged access, mailbox assignment, or access to sensitive services.",
          "ChemVault may reject, delay, rate-limit, suspend, or revoke registration if the request appears automated, fraudulent, abusive, high risk, inconsistent with these Terms, or inconsistent with administrator policy.",
        ],
        clauses: [
          "You may not create accounts using bots, scripts, credential stuffing, fake identities, unauthorized automation, or security testing tools unless ChemVault has expressly approved the activity in writing.",
          "An administrator may create or import a Main Account for you, including from ChemVault Mail super or admin lists, without assigning a password. In that case, access may require SSO, administrator password setup, or another approved authentication method.",
          "ChemVault may require additional verification before granting owner, super admin, admin, mailbox administrator, API administrator, or sensitive service permissions.",
        ],
      },
      {
        title: "4. Authentication, sessions, and account security",
        paragraphs: [
          "You are responsible for maintaining the confidentiality of your password, Apple Account credentials, ChemVault Mail SSO access, devices, session cookies, verification tokens, recovery methods, and future authentication factors connected to ChemVault.",
          "ChemVault stores password hashes rather than plaintext passwords and uses httpOnly cookies for sessions. ChemVault may store session token hashes, login timestamps, user agent information, IP-derived request metadata, and security events for authentication, account protection, and audit purposes.",
          "ChemVault may revoke sessions, require password reset, unlink external identities, invalidate SSO bindings, disable mail login, or block access when ChemVault reasonably believes that an account, credential, device, mailbox, session, or administrator privilege may be compromised or misused.",
        ],
        clauses: [
          "You must notify a ChemVault administrator promptly if you believe your account, mailbox, Apple Account binding, ChemVault Mail SSO, device, token, or administrative permission has been compromised.",
          "You may not share administrator credentials, session cookies, tokens, verification codes, Apple Account assertions, ChemVault Mail SSO assertions, or mailbox credentials with unauthorized persons.",
          "ChemVault may use background or interactive abuse detection, including Cloudflare security services, for email registration and ChemVault Mail login. Apple Account login may be handled through Apple's authentication flow and may not require ChemVault's human verification challenge.",
        ],
      },
      {
        title: "5. Account roles, permissions, and access decisions",
        paragraphs: [
          "ChemVault uses account roles, system roles, user permissions, role permissions, page access, service access, mail-account bindings, and administrative rules to determine whether a user may access a page, service, API, file, model, document, audit log, or admin function. Mailbox sending, receiving, and login follow ChemVault Mail role assignment.",
          "The original role field, including free, pro, and admin, may indicate plan or account tier. The system role field, including user, staff, service admin, admin, super admin, and owner, controls platform authority together with permissions and access records. A user may have a high account tier without administrator authority, or administrator authority without a paid plan.",
          "Owner and super admin roles may have broad or unrestricted access. Ordinary admins may be restricted from changing, deleting, disabling, or downgrading owner or super admin accounts. ChemVault Mail records do not grant User Center authority by themselves.",
        ],
        clauses: [
          "Deny permissions may override allow permissions. Disabled, suspended, or deleted accounts may be prevented from using all services regardless of other permissions.",
          "Service access or page access marked disabled or suspended may prevent access even when another permission appears to allow related activity.",
          "Access decisions may be cached, logged, or re-evaluated as ChemVault services communicate with the main account system.",
        ],
      },
      {
        title: "6. ChemVault Mail accounts and aliases",
        paragraphs: [
          "A Mail Account is an administrative assignment, not an automatic entitlement. ChemVault may allow an administrator to assign a chemvault.science mailbox, display name, mailbox status, aliases, and quota to a Main Account. Mail sending, receiving, and login behavior follows the role assigned in ChemVault Mail.",
          "You may use a Mail Account only for lawful, authorized, and policy-compliant activity. Mail Accounts may not be used for spam, phishing, credential theft, harassment, malware distribution, evasion of security controls, impersonation, unauthorized mass messaging, or activity that damages the reputation or deliverability of ChemVault domains.",
          "Mailboxes, aliases, quota, login rights, sending rights, and receiving rights may be changed, suspended, or removed by ChemVault or an authorized administrator at any time for security, abuse prevention, operational requirements, account termination, or policy enforcement.",
        ],
        clauses: [
          "ChemVault Mail super users and admin users may be imported into synchronization records for audit and review, but they do not automatically receive User Center super admin or admin authority. Mail runtime authority remains tied to ChemVault Mail role assignment.",
          "Mailbox deletion may be implemented as soft deletion. Logs, aliases, routing history, administrative records, and security records may be retained after deletion where needed.",
          "You are responsible for messages, attachments, aliases, forwarding, and account activity performed through a Mail Account assigned to you.",
        ],
      },
      {
        title: "7. Acceptable use",
        paragraphs: [
          "ChemVault is intended for lawful research, education, scientific workflow support, identity management, file and document workflows, model and molecule workflows, notifications, account administration, and related operational use.",
          "You must not use ChemVault to violate law, violate institutional policy, infringe intellectual property, compromise security, exfiltrate data, evade access controls, interfere with infrastructure, harm other users, or process content that you are not authorized to process.",
        ],
        clauses: [
          "You may not attack, scan, overload, scrape, crawl, reverse engineer, bypass, probe, or interfere with ChemVault infrastructure, Cloudflare controls, authentication flows, permission checks, rate limits, audit logs, admin tooling, or other users.",
          "You may not upload or transmit malware, exploit code, credential material, illegal content, deceptive content, unsolicited commercial messages, or content that violates privacy, export-control, safety, laboratory, or institutional obligations.",
          "You may not sell, rent, sublicense, resell, white-label, or commercially exploit ChemVault accounts, APIs, mailboxes, credentials, or access rights unless ChemVault has expressly authorized that activity in writing.",
        ],
      },
      {
        title: "8. Scientific, AI, extraction, and model output",
        paragraphs: [
          "ChemVault may provide AI extraction, model, molecule, search, document, and API features. These features are workflow aids. They may be inaccurate, incomplete, delayed, biased, duplicated, unsafe, or unsuitable for a particular scientific, operational, or commercial decision.",
          "You are responsible for independently reviewing, validating, reproducing, and documenting chemical, biological, medical, materials-science, regulatory, patent, safety, experimental, and business conclusions before relying on any ChemVault output.",
          "ChemVault does not provide medical, legal, regulatory, hazardous-materials, laboratory safety, manufacturing, clinical, patent, or professional advice through automated output, model responses, extraction results, previews, summaries, or recommendations.",
        ],
        clauses: [
          "You must not rely on ChemVault output as the sole basis for clinical care, safety-critical workflows, legal compliance, publication claims, patent filings, regulated submissions, manufacturing steps, or high-impact decisions.",
          "You are responsible for determining whether a ChemVault service is appropriate for the data, material, compound, document, sample, experiment, jurisdiction, and workflow involved.",
          "Beta, preview, coming soon, experimental, or mock features may be changed, limited, withdrawn, reset, or made unavailable without notice.",
        ],
      },
      {
        title: "9. User Content and license to operate the services",
        paragraphs: [
          "You retain whatever ownership rights you have in User Content. ChemVault does not claim ownership of your User Content merely because you submit it to ChemVault.",
          "You grant ChemVault a worldwide, non-exclusive, royalty-free license to host, store, process, transmit, display, transform, index, analyze, cache, secure, back up, and otherwise use User Content as necessary to provide, maintain, secure, troubleshoot, and improve the services, enforce permissions, comply with administrator instructions, and operate connected ChemVault workflows.",
          "You represent and warrant that you have all rights, permissions, consents, approvals, and legal bases needed to submit User Content to ChemVault and to allow ChemVault to process it under these Terms.",
        ],
        clauses: [
          "You must not submit personal data, confidential information, regulated data, export-controlled data, patient information, protected health information, trade secrets, third-party proprietary data, controlled substances data, or hazardous-materials information unless you have authority and the relevant ChemVault environment is approved for that data.",
          "ChemVault may remove, restrict, quarantine, or disable User Content if ChemVault reasonably believes it violates these Terms, creates security risk, infringes rights, violates law, or exposes ChemVault or another user to harm.",
          "ChemVault may generate metadata, indexes, usage records, audit records, access decisions, and security logs from User Content and account activity.",
        ],
      },
      {
        title: "10. Plans, quotas, billing, and commercial features",
        paragraphs: [
          "ChemVault may offer free, pro, team, enterprise, API, storage, AI usage, mailbox, or other plans. Plan names, features, quotas, rates, credit limits, storage limits, mailbox limits, API limits, and access rights may change over time.",
          "ChemVault may integrate Stripe or another payment processor in the future. Payment processing, taxes, renewals, cancellations, refunds, chargebacks, invoices, receipts, and billing data may be governed by additional checkout terms and processor policies when commercial billing is enabled.",
          "A plan, quota, or feature label does not guarantee permanent availability. ChemVault may modify, suspend, replace, or discontinue features for technical, business, legal, security, or operational reasons.",
        ],
        clauses: [
          "Free or preview access may be limited, throttled, modified, reset, or withdrawn at any time.",
          "Usage records may be used to calculate credits, quotas, storage, API usage, mail usage, extraction activity, model activity, and plan eligibility.",
          "Failure to pay future charges, if billing is enabled, may result in downgrade, suspension, deletion, disabled features, or restricted access.",
        ],
      },
      {
        title: "11. Audit logs, monitoring, and administrative records",
        paragraphs: [
          "ChemVault may create and retain audit logs and operational records to protect accounts, enforce permissions, investigate misuse, support administrators, verify access decisions, maintain service reliability, and comply with legal or institutional obligations.",
          "Audit and operational records may include login events, failed login events, session metadata, IP-derived request metadata, user agent strings, profile updates, role changes, permission changes, page access changes, service access changes, mailbox assignments, alias changes, quota changes, admin actions, API calls, usage logs, access-check results, and security events.",
        ],
        clauses: [
          "Administrators with appropriate permissions may view audit logs and account records for users under their authority.",
          "You may not disable, falsify, flood, delete, bypass, or interfere with logging, monitoring, verification, rate-limiting, Turnstile, SSO, access checks, or audit controls.",
          "ChemVault may preserve audit logs after account deletion when necessary for security, dispute resolution, abuse prevention, legal compliance, or institutional governance.",
        ],
      },
      {
        title: "12. Third-party services and integrations",
        paragraphs: [
          "ChemVault may rely on third-party infrastructure, identity, security, storage, billing, analytics, and communication providers, including Cloudflare, Apple, ChemVault Mail infrastructure, Stripe, AI providers, and other services that ChemVault configures from time to time.",
          "Third-party services may have their own terms, privacy notices, availability limits, data handling practices, account requirements, regional restrictions, and security controls. ChemVault is not responsible for third-party outages, platform changes, policy changes, authentication decisions, billing processor decisions, or restrictions outside ChemVault's control.",
        ],
        clauses: [
          "Using Apple Account sign-in may redirect you to Apple's authentication service and may require Apple to process information according to Apple's policies.",
          "Using Cloudflare Turnstile or Cloudflare-hosted ChemVault services may cause Cloudflare to process security and request information under Cloudflare policies.",
          "You may not use third-party integrations to bypass ChemVault account, role, permission, security, or billing controls.",
        ],
      },
      {
        title: "13. ChemVault intellectual property and feedback",
        paragraphs: [
          "ChemVault and its licensors own ChemVault software, source code, interfaces, workflows, trademarks, logos, design systems, documentation, permission models, service names, database schemas, APIs, and related intellectual property, except for User Content and third-party materials.",
          "These Terms grant you a limited, revocable, non-exclusive, non-transferable right to access and use ChemVault only as permitted by ChemVault, by your account role, by your permissions, by administrator policy, and by these Terms.",
          "If you provide ideas, bug reports, feature requests, comments, designs, suggestions, or other feedback, ChemVault may use that feedback without restriction or compensation, provided that ChemVault's use remains subject to any written confidentiality obligations that separately apply.",
        ],
        clauses: [
          "You may not copy, modify, create derivative works from, publicly display, resell, rent, remove notices from, or misuse ChemVault software, branding, documentation, or interfaces unless ChemVault has authorized it.",
          "You may not use ChemVault names, logos, domain names, or service marks in a way that suggests sponsorship, endorsement, or affiliation without permission.",
          "You may not attempt to extract source code, training data, system prompts, model internals, security controls, private APIs, or non-public implementation details except as allowed by law and expressly authorized security testing rules.",
        ],
      },
      {
        title: "14. Confidentiality, regulated data, and export obligations",
        paragraphs: [
          "ChemVault is used for scientific and operational workflows, but not every deployment is suitable for every category of sensitive data. You are responsible for determining whether the relevant service, account, permission configuration, region, institution, and contract are appropriate before submitting confidential, regulated, export-controlled, safety-sensitive, or third-party proprietary information.",
          "If you are subject to institutional review, data processing agreements, export-control restrictions, human-subject requirements, laboratory safety requirements, professional confidentiality obligations, government contract requirements, or data-localization requirements, you must satisfy those requirements before using ChemVault for affected data.",
        ],
        clauses: [
          "ChemVault may restrict or remove content, accounts, mailboxes, or services when needed to comply with law, protect safety, comply with administrator instruction, or reduce risk.",
          "You may not use ChemVault to design, optimize, procure, or deploy illegal weapons, controlled substances, harmful biological agents, malware, or other unlawful or dangerous activity.",
          "ChemVault does not guarantee that a free, preview, personal, or default account environment satisfies specialized regulated-data requirements.",
        ],
      },
      {
        title: "15. Suspension, deletion, and termination",
        paragraphs: [
          "ChemVault may suspend, disable, restrict, soft-delete, terminate, or refuse access to accounts, sessions, mailboxes, aliases, APIs, content, or services when ChemVault reasonably believes it is necessary for security, abuse prevention, legal compliance, user request, administrator request, system integrity, payment readiness, or enforcement of these Terms.",
          "You may stop using ChemVault at any time. Account deletion may be implemented as soft deletion, meaning the account is marked deleted and login is blocked while certain records are retained for legitimate operational, security, legal, audit, backup, dispute, or compliance reasons.",
        ],
        clauses: [
          "Termination of an account may not immediately delete backups, logs, audit records, permission history, security events, usage records, or records held by connected services.",
          "ChemVault may preserve evidence of misuse, administrator action, security events, access decisions, mailbox assignment, or account history after termination.",
          "Sections that by their nature should survive termination, including intellectual property, confidentiality, audit logs, disclaimers, limitations of liability, indemnity, and dispute provisions, will survive.",
        ],
      },
      {
        title: "16. Disclaimers",
        paragraphs: [
          "To the maximum extent permitted by applicable law, ChemVault is provided on an as-is and as-available basis. ChemVault disclaims all warranties, whether express, implied, statutory, or otherwise, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, availability, security, uninterrupted operation, and error-free output.",
          "ChemVault does not warrant that the services will meet your requirements, that data will never be lost, that output will be accurate or complete, that every workflow will be available, that every third-party service will function, or that security controls will prevent every unauthorized access attempt.",
        ],
        clauses: [
          "Some jurisdictions do not allow certain disclaimers, so parts of this section may not apply to you.",
          "Nothing in these Terms excludes warranties or rights that cannot legally be excluded.",
          "You are responsible for maintaining appropriate backups, reviews, validations, export controls, safety checks, and institutional approvals for your work.",
        ],
      },
      {
        title: "17. Limitation of liability",
        paragraphs: [
          "To the maximum extent permitted by applicable law, ChemVault and its operators, administrators, contributors, licensors, service providers, and affiliates will not be liable for indirect, incidental, special, consequential, exemplary, punitive, or enhanced damages; lost profits; lost revenue; lost savings; lost goodwill; lost data; business interruption; research delay; publication delay; procurement delay; safety incident; or cost of substitute services arising from or related to ChemVault.",
          "To the maximum extent permitted by applicable law, ChemVault's aggregate liability for all claims arising from or related to the services or these Terms will not exceed the greater of the amount paid by you to ChemVault for the affected service during the three months before the event giving rise to liability or one hundred United States dollars.",
        ],
        clauses: [
          "The limitations in this section apply regardless of legal theory, including contract, tort, negligence, strict liability, warranty, statute, or otherwise, even if ChemVault was advised that damages were possible.",
          "Nothing in this section limits liability that cannot be limited under applicable law.",
          "If you use ChemVault through an organization, any liability terms in the organization's signed agreement with ChemVault may control for that organization.",
        ],
      },
      {
        title: "18. Indemnification",
        paragraphs: [
          "To the maximum extent permitted by applicable law, you will defend, indemnify, and hold harmless ChemVault and its operators, administrators, contributors, licensors, service providers, and affiliates from claims, losses, liabilities, damages, costs, and expenses, including reasonable attorneys' fees, arising from or related to your User Content, misuse of ChemVault, violation of these Terms, violation of law, infringement of rights, unauthorized access, mailbox misuse, API misuse, or breach of institutional or third-party obligations.",
          "ChemVault may control the defense of any matter subject to indemnification. You may not settle a claim in a way that imposes obligations on ChemVault, admits fault by ChemVault, or limits ChemVault rights without ChemVault's prior written consent.",
        ],
      },
      {
        title: "19. Changes to services and terms",
        paragraphs: [
          "ChemVault may change services, features, access rules, account roles, permissions, APIs, quotas, UI, integrations, billing readiness, documentation, and these Terms as the platform evolves. Changes may be required for security, legal compliance, new services, third-party provider changes, infrastructure changes, or product development.",
          "If ChemVault makes material changes, ChemVault may provide notice through the product, dashboard, email, legal pages, administrator communication, or another reasonable method. Continued use after the effective date of updated Terms means you accept the updated Terms.",
        ],
        clauses: [
          "If you do not agree to updated Terms, you must stop using ChemVault and may request account deletion subject to retention rules.",
          "ChemVault may make immediate changes without advance notice when needed for security, compliance, abuse prevention, or service integrity.",
          "The date at the top of this document indicates when this version was last updated.",
        ],
      },
      {
        title: "20. Governing law, disputes, and notices",
        paragraphs: [
          "Any governing-law, venue, arbitration, class-action waiver, limitation period, and institutional contracting language should be finalized by qualified counsel before ChemVault relies on it for commercial launch or enterprise contracting.",
          "Unless a signed agreement states otherwise, disputes should first be raised through the official ChemVault administrative or support channel so the parties can attempt to resolve account, access, billing, security, or service issues informally.",
        ],
        clauses: [
          "Notices to ChemVault should be sent through the official contact channel published for the relevant ChemVault service or organization.",
          "ChemVault may send notices to the email address on your Main Account, the mailbox assigned to your account, an administrator contact, or the user interface.",
          "If any provision of these Terms is unenforceable, the remaining provisions will remain in effect to the maximum extent permitted by law.",
        ],
      },
    ],
    closing:
      "This document is drafted as an operational legal agreement for the ChemVault main account system. It should be reviewed and localized by qualified counsel before commercial launch, enterprise contracting, regulated data processing, or public legal reliance.",
  },
  privacy: {
    title: "ChemVault Privacy Policy",
    eyebrow: "Identity and access data policy",
    icon: ShieldCheck,
    intro: [
      "Draft only. This account-system privacy text is not legal advice and must be reviewed by qualified counsel before commercial launch, enterprise contracting, regulated data processing, or public legal reliance.",
      "This Privacy Policy explains how ChemVault collects, uses, discloses, retains, and protects information in connection with ChemVault User Center, ChemVault Mail sign-in, Apple Account sign-in, Cloudflare Turnstile verification, and connected ChemVault services that rely on the main account system.",
      "ChemVault User Center is designed to serve as the identity authority and permission center for the ChemVault ecosystem. As a result, limited account, role, permission, mail-account, service-access, page-access, session, usage, and audit information may be used across ChemVault services to authenticate users and enforce access decisions.",
      "This Policy is intended to describe operational handling for the current product. If ChemVault enters into a signed data processing agreement, enterprise agreement, institutional agreement, or other written contract, that agreement may include additional privacy and security terms for the covered account or organization.",
    ],
    sections: [
      {
        title: "1. Scope and role of ChemVault",
        paragraphs: [
          "This Policy applies to user.chemvault.science and connected ChemVault services that use ChemVault User Center for authentication, access control, permissions, mail-account binding, audit, or account administration. It does not govern third-party websites or services that ChemVault does not control.",
          "Depending on the context, ChemVault may act as a service operator, data controller, service provider, processor, or administrator on behalf of an institution or organization. The specific legal role may depend on the account type, deployment, contract, jurisdiction, data category, and institutional relationship.",
        ],
        clauses: [
          "If you use ChemVault through an organization, your organization may control certain account settings, permissions, mailboxes, usage data, audit logs, and retention decisions.",
          "Administrators may access and manage information according to their permissions and the policies of the organization or ChemVault deployment.",
          "This Policy should be read together with the ChemVault Terms of Service and any service-specific privacy or data notices.",
        ],
      },
      {
        title: "2. Account information we collect",
        paragraphs: [
          "ChemVault may collect information that you provide directly when registering, signing in, completing a profile, accepting terms, linking Apple Account, using ChemVault Mail SSO, requesting access, binding a mailbox, or using connected services.",
          "Account information may include name, email address, avatar, institution, university, organization, field of interest, bio, website, GitHub link, role, system role, source, account status, account creation date, update date, last login date, and administrator-assigned metadata.",
        ],
        clauses: [
          "ChemVault may collect password hashes, but it does not intentionally store plaintext passwords.",
          "ChemVault may collect external identity metadata, such as Apple Account subject identifiers or ChemVault Mail SSO identifiers, when you link or use those login methods.",
          "ChemVault may collect consent records, acceptance timestamps, verification results, and registration context needed to prove account creation and policy acceptance.",
        ],
      },
      {
        title: "3. Permission, mail, and administrative information",
        paragraphs: [
          "Because ChemVault User Center is the permission center, ChemVault stores information about roles, system roles, permissions, service access, page access, mailbox accounts, aliases, mailbox quotas, mail status, administrator actions, and access decisions.",
          "ChemVault may also store synchronization records from ChemVault Mail, including super user and admin user lists, sync timestamps, source labels, and results of manual or future automated mail-admin synchronization.",
        ],
        clauses: [
          "Permission and role records may be used to determine whether a user can access ChemVault File, Docs, Model, Extract, Molecule, Notif, Admin, API, and other services. ChemVault Mail runtime rights are determined by Mail role assignment.",
          "Mail-account records may include mail address, display name, aliases, status, quota, linked Main Account, Mail role, and related mailbox metadata. Sending, receiving, and Mail login behavior follows ChemVault Mail role assignment.",
          "Administrative logs may record who changed a user, permission, role, mailbox, service access, page access, status, or security setting.",
        ],
      },
      {
        title: "4. Content and service data",
        paragraphs: [
          "Depending on which ChemVault services you use, ChemVault may process files, documents, extraction inputs, chemical or molecular information, prompts, model inputs, model outputs, API requests, generated outputs, usage logs, storage metadata, notification metadata, and related service data.",
          "ChemVault processes service data to provide the requested workflow, enforce access controls, maintain usage records, troubleshoot errors, improve reliability, and secure the platform. The categories of service data may vary by connected service and by account permissions.",
        ],
        clauses: [
          "Do not submit personal, confidential, regulated, export-controlled, patient, hazardous, or third-party proprietary information unless you have authority and the relevant ChemVault environment is approved for that data.",
          "ChemVault may generate derived metadata, indexes, previews, summaries, extracted text, usage counters, audit records, security events, or access decisions from submitted content.",
          "Some connected services may store their own operational records while still relying on ChemVault User Center for identity and permission checks.",
        ],
      },
      {
        title: "5. Authentication, verification, cookies, and security signals",
        paragraphs: [
          "ChemVault uses authentication and security technologies to create sessions, verify users, prevent abuse, protect accounts, and reduce automated registration or login abuse. ChemVault may use httpOnly cookies for session management and may store only hashes of session tokens in the database.",
          "Email self-registration may require Cloudflare Turnstile or another verification mechanism. ChemVault Mail login may use background Turnstile or other server-side checks. Apple Account login may be handled through Apple's sign-in flow and may not require ChemVault's Turnstile challenge.",
        ],
        clauses: [
          "Security signals may include IP-derived request metadata, user agent strings, timestamps, verification tokens, challenge outcomes, failed login attempts, rate-limit signals, session creation events, and session expiration events.",
          "Cloudflare may process Turnstile and edge-security information according to Cloudflare's policies. Apple may process Apple Account sign-in information according to Apple's policies.",
          "ChemVault may retain security signals and authentication records to investigate abuse, defend against attacks, enforce Terms, and protect accounts.",
        ],
      },
      {
        title: "6. How ChemVault uses information",
        paragraphs: [
          "ChemVault uses information to create and maintain accounts, authenticate users, link external identities, enforce permissions, assign mailboxes, provide services, maintain profiles, operate dashboards, calculate usage, secure infrastructure, investigate misuse, and support administrators.",
          "ChemVault may use information to determine whether a user can access a page, service, mailbox, API, file, document, model, molecule workflow, extraction workflow, notification workflow, admin panel, or connected ChemVault system.",
        ],
        clauses: [
          "ChemVault may use information to debug errors, analyze service health, prevent fraud, enforce quotas, respond to user requests, generate audit logs, and comply with legal or institutional obligations.",
          "ChemVault may use aggregated or de-identified information to understand system performance, usage patterns, capacity planning, and product quality.",
          "ChemVault does not use plaintext passwords because plaintext passwords should not be stored by ChemVault.",
        ],
      },
      {
        title: "7. Sharing within ChemVault and with administrators",
        paragraphs: [
          "ChemVault User Center is built to share limited identity and authorization information with connected ChemVault services so those services can make access decisions. For example, a file service may need to know whether a user has service:chemvault_file:access, file:read, and page:file:view.",
          "Administrators may view or change account information, roles, permissions, mailboxes, usage data, status, audit logs, and access records according to their administrator permissions and organizational responsibility.",
        ],
        clauses: [
          "Connected services may receive account id, email, name, role, system role, status, permission keys, service access, page access, mail-account status, and Mail role metadata when needed for authentication or authorization.",
          "ChemVault intends not to expose password hashes, raw session tokens, token hashes, Apple private keys, JWT secrets, mail-system secrets, Turnstile secrets, or other sensitive secrets through user-facing APIs.",
          "The /api/access/check endpoint is intended to return only the minimum information needed for a connected service to determine access.",
        ],
      },
      {
        title: "8. Third-party processors and integrations",
        paragraphs: [
          "ChemVault may use third-party providers to host, secure, authenticate, store, process, bill, monitor, or deliver services. These providers may process information on ChemVault's behalf or under their own terms depending on the integration.",
          "Current or planned providers may include Cloudflare for hosting, Pages Functions, Workers, D1, R2, Turnstile, edge security, logs, and infrastructure; Apple for Apple Account sign-in; ChemVault Mail infrastructure for SSO and mailboxes; Stripe or another payment processor for future billing; AI providers for model or extraction workflows; and other operational providers as ChemVault evolves.",
        ],
        clauses: [
          "Third-party providers may process information in accordance with their own terms and privacy notices.",
          "ChemVault may disclose information when required by law, legal process, security necessity, abuse investigation, emergency, institutional obligation, or rights protection.",
          "ChemVault may transfer information in connection with a merger, acquisition, reorganization, financing, asset sale, or similar transaction, subject to appropriate protections where required.",
        ],
      },
      {
        title: "9. Retention, deletion, and backups",
        paragraphs: [
          "ChemVault retains information for as long as reasonably necessary to provide services, maintain accounts, enforce permissions, preserve audit records, comply with obligations, resolve disputes, prevent abuse, improve security, maintain backups, and support legitimate operational needs.",
          "Account deletion may remove the active main account record after ChemVault preserves a limited deletion record. Certain operational records may remain when necessary for security, audit, fraud prevention, dispute handling, backup, legal, institutional, or compliance reasons.",
        ],
        clauses: [
          "Profile fields may be updated by the user or an administrator where the interface permits.",
          "Mail-account records, permission history, audit logs, security events, usage logs, and access decisions may be retained after account deletion when necessary.",
          "Backup copies may persist for a limited period after deletion before they are overwritten or deleted according to backup processes.",
        ],
      },
      {
        title: "10. Security safeguards",
        paragraphs: [
          "ChemVault uses technical, organizational, and administrative safeguards designed to reduce unauthorized access, credential exposure, data loss, and accidental disclosure. These safeguards may include password hashing, httpOnly session cookies, hashed session tokens, role checks, permission checks, page access controls, service access controls, admin guards, soft deletion, audit logging, and Cloudflare security services.",
          "No security measure is absolute, and ChemVault cannot guarantee that unauthorized access, data loss, provider outages, vulnerabilities, or configuration mistakes will never occur. Users must protect credentials, use trusted devices, keep account information current, avoid sharing sessions or tokens, and report suspected compromise promptly.",
        ],
        clauses: [
          "ChemVault may restrict access, revoke sessions, force reauthentication, disable accounts, or require additional verification when security risk is detected.",
          "Administrators are responsible for granting permissions carefully and removing permissions when no longer needed.",
          "ChemVault may use logs and monitoring to detect unauthorized access, brute-force attempts, automated registration, suspicious mail activity, and administrator misuse.",
        ],
      },
      {
        title: "11. International access and institutional requirements",
        paragraphs: [
          "ChemVault may be accessed from multiple regions and may rely on global infrastructure providers. Information may be processed in regions where ChemVault, its providers, or its users operate, subject to applicable law and provider infrastructure.",
          "If your organization requires a data processing agreement, data localization, special retention schedule, export-control review, security assessment, institutional approval, or privacy impact assessment, you must obtain that approval before submitting restricted data to ChemVault.",
        ],
        clauses: [
          "Users are responsible for complying with institutional, contractual, legal, privacy, export, research, and safety requirements applicable to their data and workflows.",
          "ChemVault administrators may configure access controls to reduce risk, but access controls do not replace required legal or institutional approvals.",
          "Certain services, providers, authentication methods, or billing features may be unavailable in some regions.",
        ],
      },
      {
        title: "12. Your choices and rights",
        paragraphs: [
          "Depending on your location, relationship with ChemVault, organization, and applicable law, you may have rights to access, correct, delete, export, restrict, or object to certain processing of personal information.",
          "You can update many profile fields in User Center. You may request deletion, correction, access review, mailbox changes, role review, or permission review through available controls or an authorized ChemVault administrator.",
        ],
        clauses: [
          "Some requests may be limited by security, legal, institutional, backup, audit, fraud-prevention, dispute-resolution, or operational retention requirements.",
          "If your account is controlled by an organization, ChemVault may direct you to that organization for certain requests.",
          "ChemVault may need to verify your identity and authority before fulfilling a request.",
        ],
      },
      {
        title: "13. Cookies and similar technologies",
        paragraphs: [
          "ChemVault may use cookies, local storage, session storage, browser security mechanisms, and similar technologies to keep users signed in, remember preferences, protect sessions, enforce access controls, prevent abuse, and maintain application state.",
          "Some cookies or similar technologies are necessary for authentication and security. If you block required technologies, ChemVault may not function correctly or may be unable to authenticate your session.",
        ],
        clauses: [
          "Session cookies may be httpOnly, secure, SameSite-protected, and time-limited where appropriate.",
          "Cloudflare and other providers may use security technologies to distinguish legitimate users from automated or abusive activity.",
          "Future analytics or billing features may introduce additional notices or controls where required.",
        ],
      },
      {
        title: "14. Children and sensitive users",
        paragraphs: [
          "ChemVault is intended for research, education, organizational, scientific, and administrative workflows. It is not intended for unsupervised use by children or for users who are not permitted to create accounts under applicable law or institutional policy.",
          "If ChemVault learns that an account was created by a child without required consent, ChemVault may delete or disable the account and related information according to applicable requirements.",
        ],
      },
      {
        title: "15. Changes and contact",
        paragraphs: [
          "ChemVault may update this Privacy Policy as the account system, services, security controls, legal requirements, third-party integrations, mail-account features, billing readiness, and permission model evolve. The date at the top indicates when this version was last updated.",
          "Questions about privacy, deletion, permissions, SSO, Apple Account sign-in, ChemVault Mail, mailbox assignments, access checks, audit logs, or data handling should be directed to a ChemVault administrator or to the official contact channel published for the relevant ChemVault service or organization.",
        ],
        clauses: [
          "If ChemVault makes material changes, ChemVault may provide notice through the product, dashboard, email, administrator channel, or legal page.",
          "Continued use after an updated Policy takes effect means you acknowledge the updated handling described in the Policy.",
          "If you do not agree with updated privacy handling, you should stop using ChemVault and request account deletion or organization-level review where applicable.",
        ],
      },
    ],
    closing:
      "This Privacy Policy is drafted as a detailed operational privacy notice for the ChemVault main account system. It should be reviewed and localized by qualified counsel before commercial launch, enterprise contracting, regulated data processing, or public legal reliance.",
  },
};

function clauseMarker(sectionIndex: number, clauseIndex: number) {
  return `${sectionIndex + 1}.${clauseIndex + 1}`;
}

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
      <div className="legal-document-intro">
        {agreement.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="legal-document-sections">
        {agreement.sections.map((section, sectionIndex) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.clauses?.length ? (
              <ol className="legal-document-clauses">
                {section.clauses.map((clause, clauseIndex) => (
                  <li key={clause}>
                    <span className="legal-document-clause-marker">
                      {clauseMarker(sectionIndex, clauseIndex)}
                    </span>
                    <p>{clause}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>
      <footer className="legal-document-note">{agreement.closing}</footer>
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
