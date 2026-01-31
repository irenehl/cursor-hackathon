"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const WAITLIST_URL =
  "https://waitlist.vudy.app/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGndXVdJE08V7-Z0tVIKSZFfHJad8JU9URSw_TrGm4gjm9LHlRIUHqEeOnpu_c_aem_Y4IPry5DyOrIM5JjYqoXew";

export default function WaitlistPage() {
  const [linkClicked, setLinkClicked] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Redirect after 2 seconds (only if link wasn't clicked)
    if (!linkClicked) {
      const redirectTimer = setTimeout(() => {
        window.location.assign(WAITLIST_URL);
      }, 2000);

      return () => {
        clearTimeout(redirectTimer);
      };
    }
  }, [linkClicked]);

  useEffect(() => {
    // Handle countdown and redirect when link is clicked
    if (linkClicked) {
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            window.location.assign(WAITLIST_URL);
            return 0;
          }
          return prev - 1;
        });
      }, 1500);

      return () => {
        clearInterval(countdownInterval);
      };
    }
  }, [linkClicked]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setLinkClicked(true);
  };

  return (
    <main className="min-h-screen bg-background text-text antialiased flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {linkClicked ? (
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl mb-4 text-text leading-relaxed" style={{ fontFamily: 'var(--font-press-start)' }}>
              Yes, we will forcing to see our partners page
            </h1>
            <div className="mb-6 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="mb-6 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-accent mx-auto"></div>
              <h1 className="text-2xl md:text-3xl mb-4 text-text leading-relaxed" style={{ fontFamily: 'var(--font-press-start)' }}>
                We know, you are hungry for more...
              </h1>
              <p className="text-lg text-text-muted">
                Redirecting you to the waitlist
              </p>
            </div>
            <div className="mt-8">
              <Link
                href={WAITLIST_URL}
                onClick={handleLinkClick}
                className="text-accent hover:text-accent-hover underline text-base transition-colors"
              >
                If you're not redirected, click here to continue
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
