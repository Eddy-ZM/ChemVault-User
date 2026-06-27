import { AppleSignInButton } from "./AppleSignInButton";
import { OAuthSignInButton } from "./OAuthSignInButton";

const microsoftUnavailableReason = "Temporarily unavailable due to Microsoft-side limitations.";

export function OAuthButtonGroup({ returnTo = "/dashboard" }: { returnTo?: string }) {
  return (
    <div className="oauth-provider-grid">
      <AppleSignInButton returnTo={returnTo} label="Continue with Apple Account" />
      <OAuthSignInButton provider="google" returnTo={returnTo} />
      <OAuthSignInButton provider="github" returnTo={returnTo} />
      <OAuthSignInButton provider="microsoft" returnTo={returnTo} disabledReason={microsoftUnavailableReason} />
    </div>
  );
}
