import { signOut } from "./actions";

/** Plain form posting to a Server Action: works without JavaScript. */
export function SignOutButton({ className = "btn btn-secondary" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}
