import { Link } from "react-router-dom";
import { AppleSignInButton } from "./AppleSignInButton";
import { OAuthSignInButton } from "./OAuthSignInButton";

export function OAuthButtonGroup({ returnTo = "/dashboard" }: { returnTo?: string }) {
  return (
    <>
      <div className="oauth-provider-grid">
        <AppleSignInButton returnTo={returnTo} label="Continue with Apple Account" />
        <OAuthSignInButton provider="google" returnTo={returnTo} />
        <OAuthSignInButton provider="github" returnTo={returnTo} />
        <OAuthSignInButton provider="microsoft" returnTo={returnTo} />
      </div>
      <p className="text-xs leading-5 text-slate-500">
        By continuing with Apple, Google, GitHub, Microsoft, or another connected sign-in provider, you agree to the{" "}
        <Link className="font-semibold text-blue-700" to="/terms">Terms of Service</Link>{" "}
        and acknowledge the{" "}
        <Link className="font-semibold text-blue-700" to="/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
