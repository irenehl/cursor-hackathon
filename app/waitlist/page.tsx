"use client";

import { useEffect } from "react";
import Link from "next/link";

const WAITLIST_URL =
  "https://waitlist.vudy.app/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGndXVdJE08V7-Z0tVIKSZFfHJad8JU9URSw_TrGm4gjm9LHlRIUHqEeOnpu_c_aem_Y4IPry5DyOrIM5JjYqoXew";

export default function WaitlistPage() {
  useEffect(() => {
    // Redirect after 1.5 seconds
    const redirectTimer = setTimeout(() => {
      window.location.assign(WAITLIST_URL);
    }, 1500);

    return () => {
      clearTimeout(redirectTimer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-text antialiased flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="mb-6 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent mx-auto"></div>
          <h1 className="text-2xl md:text-3xl font-medium mb-4 text-text leading-relaxed">
            We know, you are hungry for more...
          </h1>
          <p className="text-lg text-text-muted">
            Redirecting you to the waitlist
          </p>
        </div>
        <div className="mt-8">
          <Link
            href={WAITLIST_URL}
            className="text-accent hover:text-accent-hover underline text-base transition-colors"
          >
            If you're not redirected, click here to continue
          </Link>
        </div>
      </div>
    </main>
  );
}
