import Form from "next/form";

import { SearchIcon } from "@/components/icons";

/**
 * GET form to /search?q=…: client-side navigation with next/form, and a plain
 * form submission when JavaScript is unavailable.
 */
export function SearchForm({ query = "" }: { query?: string }) {
  return (
    <Form
      action="/search"
      role="search"
      className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row sm:items-stretch"
    >
      <label htmlFor="search-query" className="sr-only">
        Search products
      </label>
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          // Re-mount on a new query so the field shows it after back/forward navigation.
          key={query}
          id="search-query"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by piece, colour or category"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={100}
          className="min-h-control w-full border border-line-strong bg-paper pr-4 pl-12 text-body-sm outline-none focus-visible:outline-1 focus-visible:outline-offset-2"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </Form>
  );
}
