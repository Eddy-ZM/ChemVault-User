import { Building2, CreditCard, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";

export function PlanSettings() {
  const { user } = useAuth();

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Billing / Plan</p>
          <h1>Subscription readiness</h1>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <article className="plan-card plan-card-active">
          <CreditCard className="h-5 w-5 text-blue-700" />
          <h2>Current plan: {user?.role === "pro" ? "Pro" : user?.role === "admin" ? "Admin" : "Free"}</h2>
          <ul>
            <li>Limited AI extraction</li>
            <li>Limited storage</li>
            <li>Basic user dashboard</li>
          </ul>
        </article>
        <article className="plan-card">
          <Sparkles className="h-5 w-5 text-violet-700" />
          <h2>Pro Plan Coming Soon</h2>
          <p>Reserved for higher extraction credits, expanded storage, and advanced research workflows.</p>
        </article>
        <article className="plan-card">
          <Building2 className="h-5 w-5 text-cyan-700" />
          <h2>Team Plan Coming Soon</h2>
          <p>Reserved for shared workspaces, organization controls, and team billing.</p>
        </article>
      </div>
      <div className="settings-panel">
        <p className="label">Stripe integration placeholder</p>
        <p className="text-sm leading-6 text-slate-600">
          The plan page intentionally ships as UI only. Add Stripe Checkout, Customer Portal, and webhook routes here when ChemVault
          commercial plans are ready.
        </p>
      </div>
    </section>
  );
}
