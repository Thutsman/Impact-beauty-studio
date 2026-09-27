import { AuthForms } from "@/components/admin/AuthForms";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Staff sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <Logo variant="compact" />
      <h1 className="mt-8 font-serif text-4xl">Staff</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Sign in to the Impact Beauty Studio diary.</p>
      {query.error === "config" ? <p className="mt-4 text-sm text-gold-soft">Add the Supabase keys in .env.local before signing in.</p> : null}
      <AuthForms />
    </main>
  );
}
