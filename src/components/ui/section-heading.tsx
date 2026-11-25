import Link from "next/link";

type SectionHeadingProps = {
  id: string;
  eyebrow?: string;
  title: string;
  action?: { label: string; href: string };
};

export function SectionHeading({ id, eyebrow, title, action }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 lg:mb-12">
      <div>
        {eyebrow && <p className="eyebrow text-muted">{eyebrow}</p>}
        <h2 id={id} className="heading-display mt-2 text-headline">
          {title}
        </h2>
      </div>
      {action && (
        <Link href={action.href} className="link-nav">
          {action.label}
        </Link>
      )}
    </div>
  );
}
