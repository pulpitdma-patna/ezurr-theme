import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Page not found</h1>
      <p className="max-w-md text-sm text-[#6E6E73]">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center rounded-xl bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
      >
        Back to store
      </Link>
    </div>
  );
}
