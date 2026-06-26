import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AgreementContent, type AgreementKind } from "../components/LegalAgreement";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";

export function LegalDocumentPage({ kind }: { kind: AgreementKind }) {
  return (
    <main className="auth-page legal-page">
      <section className="auth-card auth-card-wide legal-page-card">
        <Link className="auth-brand-link" to="/register">
          <ArrowLeft className="h-4 w-4" />
          <BrandLogo compact title="ChemVault User Center" subtitle="Legal record" />
        </Link>
        <AgreementContent kind={kind} />
      </section>
      <UserSystemFooter compact />
    </main>
  );
}
