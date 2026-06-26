import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function GlobalInteractions() {
  return <RouteProgress />;
}

function RouteProgress() {
  const location = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 620);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return <div className={`route-progress ${active ? "route-progress-active" : ""}`} aria-hidden="true" />;
}
