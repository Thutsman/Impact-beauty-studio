import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/AuthForms";
import { Logo } from "@/components/brand/Logo";
import { getSession } from "@/server/admin-data";

export const metadata = { title: "Link studio", robots: { index: false } };

export default async function SetupPage() {
  const session = await getSession();
  if (!session?.user) redirect("/admin/login");
  if (session.profile) redirect("/admin");

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <Logo variant="compact" />
      <h1 className="mt-8 font-serif text-4xl">Link the studio</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Enter the setup key from the studio environment. This can be used once, by the first owner.
      </p>
      <SetupForm />
    </main>
  );
}
