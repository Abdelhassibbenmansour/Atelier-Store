"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

import { createProduct, updateProduct, type AdminActionState } from "@/lib/admin/actions";
import { centsToPriceInput, slugify } from "@/lib/admin/validation";

import {
  ActionMessage,
  CheckboxField,
  inputClass,
  SelectField,
  TextAreaField,
  TextField,
} from "./fields";

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  reference: string;
  categoryId: string;
  priceCents: number | null;
  color: string;
  description: string;
  details: string[];
  sizes: { label: string; available: boolean }[];
  images: { src: string; alt: string }[];
  isNew: boolean;
};

const IDLE: AdminActionState = { status: "idle" };
let rowKey = 0;
const withKeys = <T,>(rows: T[]) => rows.map((row) => ({ key: ++rowKey, row }));

/**
 * Create / edit form. Submitted through useActionState from onSubmit (not the form's
 * `action` prop) so a validation error never resets what the admin typed.
 */
export function ProductForm({
  mode,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  categories: { id: string; name: string }[];
  initial: ProductFormValues;
}) {
  const [state, formAction] = useActionState(
    mode === "create" ? createProduct : updateProduct,
    IDLE,
  );
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [sizes, setSizes] = useState(() => withKeys(initial.sizes));
  const [images, setImages] = useState(() =>
    withKeys(initial.images.length ? initial.images : [{ src: "", alt: "" }]),
  );
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={onSubmit} aria-busy={pending} className="flex flex-col gap-10" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <fieldset disabled={pending} className="m-0 grid min-w-0 gap-6 border-0 p-0 lg:grid-cols-2">
        <legend className="eyebrow mb-4 text-muted">Basics</legend>
        <TextField
          label="Name"
          name="name"
          defaultValue={initial.name}
          error={errors.name}
          required
          maxLength={120}
          onChange={(e) => !slugTouched && setSlug(slugify(e.currentTarget.value))}
        />
        {mode === "create" ? (
          <TextField
            label="Slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.currentTarget.value);
            }}
            error={errors.slug}
            hint={`Product URL: /products/${slug || "…"}. Can’t be changed later.`}
            required
            maxLength={80}
          />
        ) : (
          <TextField
            label="Slug"
            value={slug}
            readOnly
            disabled
            hint="Fixed after creation so product links keep working."
          />
        )}
        <TextField
          label="Style reference"
          name="reference"
          defaultValue={initial.reference}
          error={errors.reference}
          required
          maxLength={40}
        />
        <SelectField
          label="Category"
          name="categoryId"
          defaultValue={initial.categoryId}
          error={errors.categoryId}
          required
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Price (USD)"
          name="price"
          inputMode="decimal"
          defaultValue={initial.priceCents === null ? "" : centsToPriceInput(initial.priceCents)}
          error={errors.price}
          hint="For example 1250 or 1250.50. Applies to new checkouts only."
          required
        />
        <TextField
          label="Colour"
          name="color"
          defaultValue={initial.color}
          error={errors.color}
          required
          maxLength={60}
        />
        <div className="lg:col-span-2">
          <TextAreaField
            label="Description"
            name="description"
            defaultValue={initial.description}
            error={errors.description}
            required
            maxLength={2000}
          />
        </div>
        <div className="lg:col-span-2">
          <TextAreaField
            label="Details & materials"
            name="details"
            defaultValue={initial.details.join("\n")}
            error={errors.details}
            hint="One per line."
          />
        </div>
        <div className="lg:col-span-2">
          <CheckboxField
            label="New season"
            name="isNew"
            defaultChecked={initial.isNew}
            hint="Shown first in New arrivals, with a “New” badge."
          />
        </div>
        {mode === "create" && (
          <TextField
            label="Initial stock"
            name="initialStock"
            inputMode="numeric"
            defaultValue="0"
            error={errors.initialStock}
            hint="Units available. You can change it later on the Stock page."
          />
        )}
      </fieldset>

      <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="eyebrow mb-2 text-muted">Sizes</legend>
        <p className="text-caption text-muted">
          Leave empty for one-size pieces. Stock is shared across all sizes.
        </p>
        {errors.sizes && <p className="text-caption text-error">{errors.sizes}</p>}
        {sizes.map(({ key, row }, index) => (
          <div key={key} className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor={`size-${key}`}>
              Size label
            </label>
            <input
              id={`size-${key}`}
              name={`sizes.${index}.label`}
              defaultValue={row.label}
              placeholder="e.g. 38"
              maxLength={20}
              className={`${inputClass} max-w-40`}
            />
            <label className="flex items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                name={`sizes.${index}.available`}
                defaultChecked={row.available}
                className="size-4 accent-ink"
              />
              Available
            </label>
            <button
              type="button"
              onClick={() => setSizes((rows) => rows.filter((r) => r.key !== key))}
              className="link-nav text-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSizes((rows) => [...rows, ...withKeys([{ label: "", available: true }])])
          }
          className="btn btn-secondary btn-sm self-start"
        >
          Add size
        </button>
      </fieldset>

      <fieldset disabled={pending} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="eyebrow mb-2 text-muted">Images</legend>
        <p className="text-caption text-muted">
          The first image is used on product cards. Unsplash URLs only for now.
        </p>
        {errors.images && <p className="text-caption text-error">{errors.images}</p>}
        {images.map(({ key, row }, index) => (
          <div key={key} className="grid gap-3 border-b pb-4 md:grid-cols-12 md:items-end">
            <div className="md:col-span-6">
              <TextField
                label={index === 0 ? "Primary image URL" : `Image ${index + 1} URL`}
                name={`images.${index}.src`}
                defaultValue={row.src}
                inputMode="url"
                placeholder="https://images.unsplash.com/photo-…"
              />
            </div>
            <div className="md:col-span-5">
              <TextField
                label="Image description (alt text)"
                name={`images.${index}.alt`}
                defaultValue={row.alt}
                maxLength={200}
              />
            </div>
            <div className="md:col-span-1">
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setImages((rows) => rows.filter((r) => r.key !== key))}
                  className="link-nav inline-flex min-h-control items-center text-muted hover:text-ink"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {images.length < 10 && (
          <button
            type="button"
            onClick={() => setImages((rows) => [...rows, ...withKeys([{ src: "", alt: "" }])])}
            className="btn btn-secondary btn-sm self-start"
          >
            Add image
          </button>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
