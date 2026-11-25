import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-narrow section flex flex-col items-center gap-6 text-center">
      <p className="eyebrow text-muted">Error 404</p>
      <h1 className="heading-display text-headline">This page could not be found</h1>
      <p className="max-w-prose text-body text-muted">
        The piece you are looking for may have moved or is no longer available.
      </p>
      <Link href="/" className="btn btn-secondary mt-2">
        Back to home
      </Link>
    </div>
  );
}
