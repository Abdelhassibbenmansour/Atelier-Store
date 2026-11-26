/** Admin categories — URL: /admin/categories (role "admin" only). */
import type { Metadata } from "next";
import { Suspense } from "react";

import { listAdminCategories } from "@/lib/admin/data";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton } from "../_components/admin-ui";
import { CategoryRow, CreateCategoryForm } from "../_components/category-forms";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "Categories" } : {};
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminSkeleton rows={4} />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  await requireAdmin("/admin/categories");
  const categories = await listAdminCategories();

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Categories"
        description="Each category has a storefront page at /its-slug. Rename and reorder them here."
      />
      <section aria-labelledby="category-list">
        <div className="hidden border-b pb-3 text-caption uppercase tracking-label text-muted md:flex md:gap-3">
          <span id="category-list" className="flex-1">
            Name
          </span>
          <span className="w-28">Sort order</span>
          <span className="w-40" />
        </div>
        <ul className="divide-y border-b">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
        {categories.length === 0 && (
          <p className="py-4 text-body-sm text-muted">
            No categories yet. Create the first one below.
          </p>
        )}
      </section>
      <CreateCategoryForm />
    </div>
  );
}
