/** Admin orders — URL: /admin/orders?status= (role "admin" only). All customers. */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { formatOrderDate, OrderStatusBadge, orderReference } from "@/components/order/order-parts";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema/orders";
import { listAdminOrders } from "@/lib/admin/data";
import { firstParam } from "@/lib/search-params";
import { isAdmin, requireAdmin } from "@/lib/session";

import { AdminPageHeader, AdminSkeleton, CellLabel, Money } from "../_components/admin-ui";

// Title only for admins, so the tab doesn't reveal the admin area to anyone else.
export async function generateMetadata(): Promise<Metadata> {
  return (await isAdmin()) ? { title: "Orders" } : {};
}

const filters: { value: OrderStatus | "all" | ""; label: string }[] = [
  { value: "", label: "Placed" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "needs_review", label: "Needs review" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "In checkout" },
  { value: "all", label: "All, incl. abandoned" },
];

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<AdminSkeleton />}>
        <OrdersTable statusPromise={searchParams.then((s) => firstParam(s.status))} />
      </Suspense>
    </div>
  );
}

async function OrdersTable({ statusPromise }: { statusPromise: Promise<string> }) {
  await requireAdmin("/admin/orders");
  const raw = await statusPromise;
  const status =
    raw === "all" || (ORDER_STATUSES as readonly string[]).includes(raw)
      ? (raw as OrderStatus | "all")
      : undefined;
  const rows = await listAdminOrders({ status });
  const active = status ?? "";

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Orders" description="Orders from all customers, newest first." />
      <nav aria-label="Filter orders by status">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {filters.map((filter) => (
            <li key={filter.value}>
              <Link
                href={filter.value ? `/admin/orders?status=${filter.value}` : "/admin/orders"}
                aria-current={active === filter.value ? "page" : undefined}
                className={`link-nav ${active === filter.value ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {filter.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <p className="hairline p-6 text-body-sm text-muted">No orders with this status.</p>
      ) : (
        <div className="border-y">
          <div className="hidden border-b py-3 text-caption uppercase tracking-label text-muted md:grid md:grid-cols-12 md:gap-4">
            <span className="md:col-span-2">Order</span>
            <span className="md:col-span-2">Date</span>
            <span className="md:col-span-3">Customer</span>
            <span className="md:col-span-2">Status</span>
            <span className="md:col-span-1">Items</span>
            <span className="text-right md:col-span-2">Total</span>
          </div>
          <ul className="divide-y">
            {rows.map((order) => (
              <li
                key={order.id}
                className="relative grid grid-cols-2 gap-x-4 gap-y-2 py-4 md:grid-cols-12 md:items-center"
              >
                <div className="md:col-span-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="link-subtle text-body-sm font-medium tabular-nums after:absolute after:inset-0"
                  >
                    {orderReference(order.id)}
                  </Link>
                </div>
                <div className="text-right text-body-sm text-muted md:col-span-2 md:text-left">
                  <time dateTime={order.createdAt.toISOString()}>
                    {formatOrderDate(order.createdAt)}
                  </time>
                </div>
                <div className="col-span-2 flex min-w-0 flex-col md:col-span-3">
                  <CellLabel>Customer</CellLabel>
                  <span className="text-body-sm break-all">{order.customerEmail}</span>
                </div>
                <div className="md:col-span-2">
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="text-right text-body-sm text-muted tabular-nums md:col-span-1 md:text-left">
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </div>
                <div className="col-span-2 text-right text-body-sm font-medium md:col-span-2">
                  <Money cents={order.totalCents} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rows.length === 100 && (
        <p className="text-caption text-muted">Showing the latest 100 orders.</p>
      )}
    </div>
  );
}
