/**
 * Admin stock — URL: /admin/stock?status=all|low|out&category=&q= (role "admin" only)
 *
 * Shows product_stock.quantity (units available to buy; stock held by open checkouts
 * is already subtracted) plus how many units those checkouts hold. Lowest stock first.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { listAdminCategories, listAdminStock } from "@/lib/admin/data";
import { parseStockFilters, type StockFilters } from "@/lib/admin/validation";
import { LOW_STOCK_THRESHOLD } from "@/lib/product";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton, CellLabel, StockBadge } from "../_components/admin-ui";
import { inputClass } from "../_components/fields";
import { StockControl } from "../_components/stock-control";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "Stock" } : {};
}

export default function AdminStockPage({ searchParams }: PageProps<"/admin/stock">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <StockTable filtersPromise={searchParams.then(parseStockFilters)} />
    </Suspense>
  );
}

const statusTabs: { value: StockFilters["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: `Low (1–${LOW_STOCK_THRESHOLD})` },
  { value: "out", label: "Out of stock" },
];

function filterHref(filters: StockFilters, status: StockFilters["status"]) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (filters.category) params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/admin/stock?${query}` : "/admin/stock";
}

async function StockTable({ filtersPromise }: { filtersPromise: Promise<StockFilters> }) {
  await requireAdmin("/admin/stock");
  const filters = await filtersPromise;
  const [rows, categories] = await Promise.all([listAdminStock(filters), listAdminCategories()]);
  const filtered = filters.status !== "all" || filters.category || filters.q;
  const held = rows.reduce((sum, row) => sum + row.held, 0);

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Stock"
        description="Units available to buy, lowest first. Stock is shared across sizes. Units held by open checkouts are already subtracted and come back if the checkout isn’t paid."
      />

      <nav aria-label="Filter by stock status">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {statusTabs.map((tab) => (
            <li key={tab.value}>
              <Link
                href={filterHref(filters, tab.value)}
                aria-current={filters.status === tab.value ? "page" : undefined}
                className={`link-nav ${filters.status === tab.value ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Plain GET form: filters live in the URL. */}
      <form role="search" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {filters.status !== "all" && <input type="hidden" name="status" value={filters.status} />}
        <label className="flex flex-1 flex-col gap-2">
          <span className="eyebrow">Search</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Name, slug or reference"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2 sm:w-56">
          <span className="eyebrow">Category</span>
          <select name="category" defaultValue={filters.category} className={inputClass}>
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
        {held > 0 && ` · ${held} ${held === 1 ? "unit" : "units"} held in checkout`}
        {filtered && (
          <>
            {" · "}
            <Link href="/admin/stock" className="link">
              Clear filters
            </Link>
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <p className="hairline p-6 text-body-sm text-muted">No products match these filters.</p>
      ) : (
        <ul className="divide-y border-y">
          {rows.map((product) => (
            <li key={product.id} className="grid gap-4 py-4 md:grid-cols-12 md:items-center">
              <div className="flex min-w-0 items-center gap-4 md:col-span-5">
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
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="link-subtle text-body-sm break-words"
                  >
                    {product.name}
                  </Link>
                  <span className="text-caption text-muted">
                    {product.categoryName}
                    {product.sizes?.length
                      ? ` · Sizes ${product.sizes.map((s) => (s.available ? s.label : `${s.label} (off)`)).join(", ")}`
                      : " · One size"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <CellLabel>Available</CellLabel>
                <StockBadge stock={product.stock} />
                {product.held > 0 && (
                  <span className="text-caption text-muted">{product.held} held in checkout</span>
                )}
              </div>
              <div className="md:col-span-5 md:flex md:justify-end">
                <StockControl
                  productId={product.id}
                  productName={product.name}
                  current={product.stock}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
