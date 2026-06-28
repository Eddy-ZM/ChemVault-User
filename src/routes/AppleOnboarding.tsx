import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSafeReturnTo } from "../lib/returnTo";

export function AppleOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    const params = new URLSearchParams({ returnTo, provider: "apple" });
    navigate(`/onboarding/mail?${params.toString()}`, { replace: true });
  }, [navigate, returnTo]);

  return null;
}
