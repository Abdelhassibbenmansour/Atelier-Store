"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

import {
  createCategory,
  deleteCategory,
  updateCategory,
  type AdminActionState,
} from "@/lib/admin/actions";
import { slugify } from "@/lib/admin/validation";

import { ActionMessage, inputClass, TextField } from "./fields";

const IDLE: AdminActionState = { status: "idle" };

function useAdminForm(action: (s: AdminActionState, f: FormData) => Promise<AdminActionState>) {
  const [state, formAction] = useActionState(action, IDLE);
  const [pending, startTransition] = useTransition();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };
  return { state, pending, onSubmit };
}

export function CreateCategoryForm() {
  const { state, pending, onSubmit } = useAdminForm(createCategory);
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={pending}
      noValidate
      className="hairline flex flex-col gap-4 p-6"
    >
      <h3 className="eyebrow">New category</h3>
      <fieldset disabled={pending} className="m-0 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-3">
        <TextField
          label="Name"
          name="name"
          required
          maxLength={60}
          error={errors.name}
          onChange={(e) => !touched && setSlug(slugify(e.currentTarget.value))}
        />
        <TextField
          label="Slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setTouched(true);
            setSlug(e.currentTarget.value);
          }}
          error={errors.slug}
          hint={`Page URL: /${slug || "…"}. Can’t be changed later.`}
          required
          maxLength={80}
        />
        <TextField
          label="Sort order"
          name="sortOrder"
          inputMode="numeric"
          defaultValue="0"
          error={errors.sortOrder}
          hint="Lower numbers come first."
        />
      </fieldset>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary btn-sm self-start">
          {pending ? "Creating…" : "Create category"}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

export function CategoryRow({
  category,
}: {
  category: { id: string; name: string; slug: string; sortOrder: number; productCount: number };
}) {
  const save = useAdminForm(updateCategory);
  const remove = useAdminForm(deleteCategory);
  const errors = save.state.status === "error" ? (save.state.fieldErrors ?? {}) : {};
  const busy = save.pending || remove.pending;

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <form
          onSubmit={save.onSubmit}
          noValidate
          className="flex flex-1 flex-col gap-3 md:flex-row md:items-start"
        >
          <input type="hidden" name="id" value={category.id} />
          <label className="flex flex-1 flex-col gap-1">
            <span className="sr-only">Name of {category.name}</span>
            <input
              name="name"
              defaultValue={category.name}
              maxLength={60}
              disabled={busy}
              aria-invalid={errors.name ? true : undefined}
              className={inputClass}
            />
            {errors.name && <span className="text-caption text-error">{errors.name}</span>}
          </label>
          <label className="flex flex-col gap-1 md:w-28">
            <span className="sr-only">Sort order of {category.name}</span>
            <input
              name="sortOrder"
              inputMode="numeric"
              defaultValue={String(category.sortOrder)}
              disabled={busy}
              aria-invalid={errors.sortOrder ? true : undefined}
              className={inputClass}
            />
            {errors.sortOrder && (
              <span className="text-caption text-error">{errors.sortOrder}</span>
            )}
          </label>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-secondary btn-sm self-start md:mt-1.5"
          >
            {save.pending ? "Saving…" : "Save"}
          </button>
        </form>

        <form onSubmit={remove.onSubmit} className="md:mt-1.5">
          <input type="hidden" name="id" value={category.id} />
          <button
            type="submit"
            disabled={busy || category.productCount > 0}
            title={
              category.productCount > 0 ? "Move its products to another category first" : undefined
            }
            className="btn btn-ghost btn-sm"
          >
            {remove.pending ? "Deleting…" : "Delete"}
          </button>
        </form>
      </div>
      <p className="text-caption text-muted">
        /{category.slug} · {category.productCount}{" "}
        {category.productCount === 1 ? "product" : "products"}
        {category.productCount > 0 && " · can’t be deleted while it has products"}
      </p>
      <ActionMessage state={remove.state.status !== "idle" ? remove.state : save.state} />
    </li>
  );
}
