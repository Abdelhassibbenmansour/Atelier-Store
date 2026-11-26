/** Admin: create a product — URL: /admin/products/new (role "admin" only). */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { listAdminCategories } from "@/lib/admin/data";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton } from "../../_components/admin-ui";
import { ProductForm } from "../../_components/product-form";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "New product" } : {};
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<AdminSkeleton rows={6} />}>
      <NewProductForm />
    </Suspense>
  );
}

async function NewProductForm() {
  await requireAdmin("/admin/products/new");
  const categories = await listAdminCategories();

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/products" className="link-nav self-start text-muted hover:text-ink">
        ← All products
      </Link>
      <AdminPageHeader title="New product" />
      {categories.length === 0 ? (
        <p className="hairline p-6 text-body-sm text-muted">
          Create a category first.{" "}
          <Link href="/admin/categories" className="link text-ink">
            Go to categories
          </Link>
        </p>
      ) : (
        <ProductForm
          mode="create"
          categories={categories}
          initial={{
            name: "",
            slug: "",
            reference: "",
            categoryId: "",
            priceCents: null,
            color: "",
            description: "",
            details: [],
            sizes: [],
            images: [],
            isNew: true,
          }}
        />
      )}
    </div>
  );
}
