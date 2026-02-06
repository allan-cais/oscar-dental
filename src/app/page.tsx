import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Oscar</h1>
        <p className="mt-2 text-muted-foreground">
          Dental Practice Management Platform
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border px-6 py-2 text-sm font-medium hover:bg-accent"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
