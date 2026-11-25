import { services } from "@/lib/sample-data";

export function Services() {
  return (
    <section aria-label="Services" className="border-t bg-surface">
      <ul className="container-site grid grid-cols-1 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
        {services.map((service) => (
          <li key={service.title} className="flex flex-col gap-2 text-center">
            <h3 className="eyebrow">{service.title}</h3>
            <p className="text-body-sm text-muted">{service.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
