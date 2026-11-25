import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/product/product-card";
import { getNewArrivals } from "@/lib/catalog";

export async function NewArrivals() {
  const newArrivals = await getNewArrivals();

  return (
    <section aria-labelledby="new-arrivals-title" className="section pt-0">
      <div className="container-site">
        <SectionHeading
          id="new-arrivals-title"
          eyebrow="Just in"
          title="New arrivals"
          action={{ label: "View all", href: "/new-in" }}
        />
        <div className="grid-products">
          {newArrivals.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
