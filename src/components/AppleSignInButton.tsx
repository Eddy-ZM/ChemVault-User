export function AppleSignInButton({
  returnTo = "/dashboard",
  label = "Continue with Apple",
}: {
  returnTo?: string;
  label?: string;
}) {
  return (
    <a className="apple-signin-button" href={`/api/auth/sso/apple/start?returnTo=${encodeURIComponent(returnTo)}`}>
      <span className="apple-signin-mark" aria-hidden="true">
        
      </span>
      <span>{label}</span>
    </a>
  );
}

