/** Admin products — URL: /admin/products?category=&q= (role "admin" only). */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { listAdminCategories, listAdminProducts } from "@/lib/admin/data";
import { firstParam } from "@/lib/search-params";
import { isAdmin, requireAdmin } from "@/lib/session";

import {
  AdminPageHeader,
  AdminSkeleton,
  CellLabel,
  Money,
  StockBadge,
} from "../_components/admin-ui";
import { inputClass } from "../_components/fields";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "Products" } : {};
}

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <ProductTable searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductTable({
  searchParams,
}: {
  searchParams: PageProps<"/admin/products">["searchParams"];
}) {
  await requireAdmin("/admin/products");
  const params = await searchParams;
  const categorySlug = firstParam(params.category);
  const q = firstParam(params.q).slice(0, 100);

  const [rows, categories] = await Promise.all([
    listAdminProducts({ categorySlug: categorySlug || undefined, q }),
    listAdminCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Everything renders after the admin check, so non-admins see none of it. */}
      <AdminPageHeader
        title="Products"
        description="Every product in the catalogue, with its price and current stock."
        action={{ label: "New product", href: "/admin/products/new" }}
      />
      {/* Plain GET form: filters live in the URL. */}
      <form role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2">
          <span className="eyebrow">Search</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, slug or reference"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2 sm:w-56">
          <span className="eyebrow">Category</span>
          <select name="category" defaultValue={categorySlug} className={inputClass}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      <p className="text-body-sm text-muted" role="status">
        {rows.length} {rows.length === 1 ? "product" : "products"}
        {(q || categorySlug) && (
          <>
            {" · "}
            <Link href="/admin/products" className="link">
              Clear filters
            </Link>
          </>
        )}
      </p>

      {rows.length > 0 && (
        <div className="border-y">
          <div className="hidden border-b py-3 text-caption uppercase tracking-label text-muted md:grid md:grid-cols-12 md:gap-4">
            <span className="md:col-span-5">Product</span>
            <span className="md:col-span-2">Category</span>
            <span className="md:col-span-2">Price</span>
            <span className="md:col-span-2">Stock</span>
            <span className="sr-only md:col-span-1">Actions</span>
          </div>
          <ul className="divide-y">
            {rows.map((product) => (
              <li
                key={product.id}
                className="grid grid-cols-2 gap-x-4 gap-y-3 py-4 md:grid-cols-12 md:items-center"
              >
                <div className="col-span-2 flex min-w-0 items-center gap-4 md:col-span-5">
                  <div className="media-product w-12 shrink-0">
                    {product.image && (
                      <Image
                        src={product.image.src}
                        alt=""
                        fill
                        sizes="3rem"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-body-sm break-words">
                      {product.name}
                      {product.isNew && (
                        <span className="ml-2 bg-surface px-1.5 py-0.5 text-caption uppercase tracking-label">
                          New
                        </span>
                      )}
                    </span>
                    <span className="text-caption text-muted">{product.reference}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <CellLabel>Category</CellLabel>
                  <span className="text-body-sm">{product.categoryName}</span>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <CellLabel>Price</CellLabel>
                  <span className="text-body-sm">
                    <Money cents={product.priceCents} />
                  </span>
                </div>
                <div className="flex flex-col gap-1 md:col-span-2">
                  <CellLabel>Stock</CellLabel>
                  <StockBadge stock={product.stock} />
                </div>
                <div className="flex items-center md:col-span-1 md:justify-end">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="link-nav"
                    aria-label={`Edit ${product.name}`}
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 && (
        <p className="hairline p-6 text-body-sm text-muted">No products match these filters.</p>
      )}
    </div>
  );
}
