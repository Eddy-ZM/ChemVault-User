export function AppleSignInButton({
  returnTo = "/dashboard",
  label = "Continue with Apple Account",
  mode = "login",
}: {
  returnTo?: string;
  label?: string;
  mode?: "login" | "link";
}) {
  const params = new URLSearchParams({ returnTo });
  if (mode === "link") params.set("mode", "link");

  return (
    <a className="apple-signin-button" href={`/api/auth/sso/apple/start?${params.toString()}`}>
      <span className="apple-signin-mark" aria-hidden="true">
        
      </span>
      <span>{label}</span>
    </a>
  );
}
