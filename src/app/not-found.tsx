import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5">
      <p className="text-[0.72rem] uppercase tracking-[0.22em] text-gold">Impact Beauty Studio</p>
      <h1 className="mt-4 font-serif text-5xl">This page is not available.</h1>
      <Link href="/" className="mt-8 text-[0.72rem] uppercase tracking-[0.16em] text-gold">Back home</Link>
    </main>
  );
}
