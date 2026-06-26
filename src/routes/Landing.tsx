import { ArrowRight, FlaskConical, LockKeyhole, Network } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { BrandLogo } from "../components/BrandLogo";
import { UserSystemFooter } from "../components/UserSystemFooter";

export function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <main className="gateway">
      <section className="gateway-panel">
        <BrandLogo title="ChemVault User Center" subtitle="user.chemvault.science" />
        <div className="gateway-grid">
          <div>
            <h1>ChemVault accounts, permissions, and usage in one place.</h1>
            <p>
              Manage profile identity, account security, subscription readiness, connected services, and future shared login across
              ChemVault products.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="primary-button" to="/login">
                Login
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="secondary-button" to="/register">
                Register
              </Link>
            </div>
          </div>
          <div className="gateway-stack">
            {[
              { icon: LockKeyhole, title: "httpOnly session", text: "JWT session cookie with hashed database tokens." },
              { icon: FlaskConical, title: "Research profile", text: "Institution, field, bio, and service state." },
              { icon: Network, title: "ChemVault fabric", text: "Ready for app, file, extract, molecule, and notif services." },
            ].map((item) => (
              <article className="card" key={item.title}>
                <item.icon className="mb-4 h-5 w-5 text-cyan-700" />
                <h2 className="text-base font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <UserSystemFooter compact />
    </main>
  );
}
