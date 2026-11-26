/** Admin: edit a product and its stock — URL: /admin/products/[id] (role "admin" only). */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getAdminProduct, getHeldStock, listAdminCategories } from "@/lib/admin/data";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminSkeleton, StockBadge } from "../../_components/admin-ui";
import { ProductForm } from "../../_components/product-form";
import { StockControl } from "../../_components/stock-control";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "Edit product" } : {};
}

export default function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]">) {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<AdminSkeleton rows={6} />}>
        <EditProduct
          idPromise={params.then((p) => p.id)}
          createdPromise={searchParams.then((s) => s.created === "1")}
        />
      </Suspense>
    </div>
  );
}

async function EditProduct({
  idPromise,
  createdPromise,
}: {
  idPromise: Promise<string>;
  createdPromise: Promise<boolean>;
}) {
  const id = await idPromise;
  await requireAdmin(`/admin/products/${id}`);
  const [product, categories, created, held] = await Promise.all([
    getAdminProduct(id),
    listAdminCategories(),
    createdPromise,
    getHeldStock(id),
  ]);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-10">
      <Link href="/admin/products" className="link-nav self-start text-muted hover:text-ink">
        ← All products
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="heading-display text-headline break-words">{product.name}</h2>
          <p className="text-body-sm text-muted">{product.reference}</p>
        </div>
        <Link href={`/products/${product.slug}`} className="link-nav">
          View on storefront
        </Link>
      </div>

      {created && (
        <p role="status" className="text-body-sm text-success">
          Product created. It’s now live on the storefront.
        </p>
      )}

      <section aria-labelledby="stock-title" className="hairline flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="stock-title" className="eyebrow">
            Stock
          </h3>
          <StockBadge stock={product.stock} />
        </div>
        <StockControl productId={product.id} productName={product.name} current={product.stock} />
        <p className="text-caption text-muted">
          Available to buy, shared by all sizes.{" "}
          {held > 0
            ? `${held} more ${held === 1 ? "unit is" : "units are"} held by open checkouts and come back if they aren’t paid.`
            : "No units are held by open checkouts."}
        </p>
      </section>

      <ProductForm
        mode="edit"
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          reference: product.reference,
          categoryId: product.categoryId,
          priceCents: product.priceCents,
          color: product.color,
          description: product.description,
          details: product.details,
          sizes: product.sizes ?? [],
          images: product.images,
          isNew: product.isNew,
        }}
      />
    </div>
  );
}
