import { useEffect, useState } from "react";
import { ServiceCard } from "../components/ServiceCard";
import { apiRequest } from "../lib/api";
import type { ConnectedService } from "../lib/types";

export function ConnectedServices() {
  const [services, setServices] = useState<ConnectedService[]>([]);

  useEffect(() => {
    void apiRequest<{ services: ConnectedService[] }>("/api/user/services").then((body) => setServices(body.services));
  }, []);

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="label">Connected Services</p>
          <h1>ChemVault product access</h1>
        </div>
      </div>
      <div className="service-grid">
        {services.map((service) => (
          <ServiceCard key={service.service} service={service} />
        ))}
      </div>
    </section>
  );
}
