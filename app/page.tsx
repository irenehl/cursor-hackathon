"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Box,
  Hand,
  Check,
  Gavel,
  Ghost,
  Swords,
  Gamepad2,
  ArrowRight,
  Languages,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

const LOCALE_COOKIE = "NEXT_LOCALE";

function setLocaleCookie(locale: "en" | "es") {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000`;
}

// Hook for scroll-triggered animations
function useScrollAnimation() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, visible] as const;
}

export default function LandingPage() {
  const t = useTranslations("Home");
  const locale = useLocale() as "en" | "es";
  const router = useRouter();

  const switchLocale = () => {
    const next = locale === "en" ? "es" : "en";
    setLocaleCookie(next);
    router.refresh();
  };

  // Scroll animations for different sections
  const [problemRef, problemVisible] = useScrollAnimation();
  const [featuresRef, featuresVisible] = useScrollAnimation();
  const [howItWorksRef, howItWorksVisible] = useScrollAnimation();
  const [pricingRef, pricingVisible] = useScrollAnimation();

  return (
    <main className='min-h-screen bg-background text-text antialiased selection:bg-accent selection:text-text-inverse transition-colors duration-200 relative'>
      {/* Subtle pixel grid overlay */}
      <div 
        className='fixed inset-0 pointer-events-none opacity-[0.02] z-0'
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--color-border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          animation: 'pixel-grid-scan 20s linear infinite',
        }}
      />
      {/* Navbar */}
      <nav className='w-full border-b border-border backdrop-blur-md fixed top-0 z-50 bg-background/80'>
        <div className='max-w-7xl mx-auto px-6 h-20 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Gamepad2 className='w-6 h-6 text-accent pixel-icon-pulse' />
            <span className='font-pixel text-xl tracking-tight'>PixelMeet</span>
          </div>
          <div className='flex items-center gap-4 md:gap-6'>
            <div className='hidden md:flex items-center gap-6 text-lg font-medium'>
              <a href='#features' className='hover:text-text transition-colors'>
                {t("nav.features")}
              </a>
              <a href='#pricing' className='hover:text-text transition-colors'>
                {t("nav.pricing")}
              </a>
              <Link
                href='/auth'
                className='text-text-muted hover:text-text transition-colors'
              >
                {t("nav.login")}
              </Link>
              <Link
                href='/home'
                className='bg-accent hover:bg-accent-hover text-text-inverse px-5 py-2 rounded-lg transition-all shadow-lg shadow-accent/20 text-base font-medium'
              >
                {t("nav.createEvent")}
              </Link>
              <button
                type='button'
                onClick={switchLocale}
                className='p-2 rounded-lg border border-border hover:bg-surface transition-colors flex items-center gap-1.5 text-sm font-medium'
                aria-label={locale === "en" ? "Español" : "English"}
                title={locale === "en" ? "Español" : "English"}
              >
                <Languages className='w-5 h-5' />
                <span className='hidden sm:inline'>
                  {locale === "en" ? "ES" : "EN"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className='pt-40 pb-24 md:pt-52 md:pb-32 px-6 max-w-5xl mx-auto text-center relative overflow-hidden'>
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent opacity-10 blur-[120px] -z-10 rounded-full pixel-glow'></div>

        {/* Floating pixel particles */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none -z-10'>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className='absolute w-2 h-2 bg-accent/20 rounded-sm'
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 30}%`,
                animation: `pixel-float ${4 + i}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div className='font-pixel inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs font-medium mb-8 pixel-fade-in pixel-badge-blink'>
          <span className='flex h-2 w-2 rounded-full bg-accent pixel-icon-pulse'></span>
          {t("badge")}
        </div>

        <h1 className='font-pixel text-3xl md:text-5xl tracking-tight leading-[1.3] mb-8 text-text pixel-fade-in pixel-delay-1'>
          {t("heroTitle")}
        </h1>

        <p className='text-xl md:text-2xl text-text-muted max-w-2xl mx-auto mb-12 leading-relaxed font-light pixel-fade-in pixel-delay-2'>
          {t("heroSubtitle")}
        </p>

        <div className='flex flex-col md:flex-row items-center justify-center gap-4 pixel-fade-in pixel-delay-3'>
          <Link
            href='/home'
            className='w-full md:w-auto bg-accent hover:bg-accent-hover text-text-inverse h-14 px-8 rounded-xl transition-all font-medium text-lg flex items-center justify-center gap-2 shadow-lg shadow-accent/20 pixel-button-glow group'
          >
            {t("ctaPrimary")}
            <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
          </Link>
          <Tooltip content="We're in a hackathon - why are you expecting a video demo?" className="w-full md:w-auto">
            <Link
              href='/events'
              className='w-full md:w-auto bg-surface border border-border-strong text-text h-14 px-8 rounded-xl hover:bg-surface-elevated transition-all font-medium text-lg flex items-center justify-center gap-2 hover:border-accent/50'
            >
              {t("ctaSecondary")}
            </Link>
          </Tooltip>
        </div>
      </header>

      {/* Problem/Solution Section */}
      <section ref={problemRef} className='py-24 bg-surface border-y border-border'>
        <div className='max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center'>
          <div className={`pixel-on-scroll ${problemVisible ? 'visible' : ''}`}>
            <h2 className='font-pixel text-2xl md:text-4xl tracking-tight mb-6 text-text'>
              {t("problemTitle")}
            </h2>
            <p className='text-xl text-text-muted mb-8 font-light leading-relaxed'>
              {t("problemText")}
            </p>
            <div className='space-y-4'>
              <div className='flex items-start gap-4 pixel-slide-in-left pixel-delay-1'>
                <div className='p-2 bg-accent-secondary-muted rounded-lg mt-1 pixel-icon-pulse'>
                  <X className='w-5 h-5 text-accent' />
                </div>
                <div>
                  <h4 className='text-lg font-medium text-text'>
                    {t("problemXTitle")}
                  </h4>
                  <p className='text-base text-text-muted'>
                    {t("problemXDesc")}
                  </p>
                </div>
              </div>
              <div className='flex items-start gap-4 pixel-slide-in-left pixel-delay-2'>
                <div className='p-2 bg-teal/20 rounded-lg mt-1 pixel-icon-pulse'>
                  <Check className='w-5 h-5 text-teal' />
                </div>
                <div>
                  <h4 className='text-lg font-medium text-text'>
                    {t("problemCheckTitle")}
                  </h4>
                  <p className='text-base text-text-muted'>
                    {t("problemCheckDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={`relative pixel-on-scroll ${problemVisible ? 'visible' : ''} pixel-delay-2`}>
            <div className='absolute inset-0 bg-linear-to-tr from-accent/20 to-transparent rounded-2xl blur-2xl pixel-glow'></div>
            <div className='relative bg-surface-elevated border border-border rounded-2xl p-8 aspect-square flex flex-col items-center justify-center overflow-hidden pixel-card-hover'>
              <div className='text-center'>
                <Ghost
                  className='w-24 h-24 text-text-muted mx-auto mb-4 pixel-float'
                  strokeWidth={1}
                />
                <p className='font-pixel text-xs text-accent'>
                  {t("problemVisualLabel")}
                </p>
              </div>
              <div className='flex gap-3 items-center justify-center opacity-50'>
                <div className='w-8 h-8 bg-teal/30 rounded-sm pixel-bounce' style={{ animationDelay: '0s' }}></div>
                <div className='w-8 h-8 bg-text rounded-sm pixel-bounce' style={{ animationDelay: '0.2s' }}></div>
                <div className='w-8 h-8 bg-teal/30 rounded-sm pixel-bounce' style={{ animationDelay: '0.4s' }}></div>
                <div className='w-8 h-8 bg-accent rounded-sm pixel-bounce' style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' ref={featuresRef} className='py-32 max-w-7xl mx-auto px-6'>
        <div className={`text-center mb-24 pixel-on-scroll ${featuresVisible ? 'visible' : ''}`}>
          <h2 className='font-pixel text-3xl md:text-4xl tracking-tight mb-6 text-text'>
            {t("featuresTitle")}
          </h2>
          <p className='text-xl text-text-muted max-w-2xl mx-auto'>
            {t("featuresSubtitle")}
          </p>
        </div>

        <div className='grid md:grid-cols-2 gap-8'>
          <div className={`group p-8 rounded-2xl bg-surface border border-border hover:border-accent/50 transition-all duration-300 pixel-card-hover pixel-on-scroll ${featuresVisible ? 'visible' : ''} pixel-delay-1`}>
            <div className='w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center mb-6 border border-border group-hover:border-accent pixel-icon-pulse'>
              <Box className='w-6 h-6 text-teal' />
            </div>
            <h3 className='font-pixel text-lg mb-3 tracking-tight text-text'>
              {t("feature1Title")}
            </h3>
            <p className='text-lg text-text-muted leading-relaxed'>
              {t("feature1Desc")}
            </p>
          </div>

          <div className={`group p-8 rounded-2xl bg-surface border border-border hover:border-accent/50 transition-all duration-300 pixel-card-hover pixel-on-scroll ${featuresVisible ? 'visible' : ''} pixel-delay-2`}>
            <div className='w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center mb-6 border border-border group-hover:border-accent pixel-icon-pulse'>
              <Hand className='w-6 h-6 text-teal' />
            </div>
            <h3 className='font-pixel text-lg mb-3 tracking-tight text-text'>
              {t("feature2Title")}
            </h3>
            <p className='text-lg text-text-muted leading-relaxed'>
              {t("feature2Desc")}
            </p>
          </div>

          <div className={`group p-8 rounded-2xl bg-surface border border-border hover:border-accent/50 transition-all duration-300 pixel-card-hover pixel-on-scroll ${featuresVisible ? 'visible' : ''} pixel-delay-3`}>
            <div className='w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center mb-6 border border-border group-hover:border-accent pixel-icon-pulse'>
              <Swords className='w-6 h-6 text-accent' />
            </div>
            <h3 className='font-pixel text-lg mb-3 tracking-tight text-text'>
              {t("feature3Title")}
            </h3>
            <p className='text-lg text-text-muted leading-relaxed'>
              {t("feature3Desc")}
            </p>
          </div>

          <div className={`group p-8 rounded-2xl bg-surface border border-border hover:border-accent/50 transition-all duration-300 pixel-card-hover pixel-on-scroll ${featuresVisible ? 'visible' : ''} pixel-delay-4`}>
            <div className='w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center mb-6 border border-border group-hover:border-accent pixel-icon-pulse'>
              <Gavel className='w-6 h-6 text-teal' />
            </div>
            <h3 className='font-pixel text-lg mb-3 tracking-tight text-text'>
              {t("feature4Title")}
            </h3>
            <p className='text-lg text-text-muted leading-relaxed'>
              {t("feature4Desc")}
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section ref={howItWorksRef} className='py-24 bg-surface border-y border-border'>
        <div className='max-w-4xl mx-auto px-6'>
          <h2 className={`font-pixel text-2xl md:text-3xl tracking-tight text-center mb-16 text-text pixel-on-scroll ${howItWorksVisible ? 'visible' : ''}`}>
            {t("howItWorksTitle")}
          </h2>

          <div className='relative border-l border-border-strong ml-6 md:ml-0 md:pl-0 space-y-12'>
            <div className={`relative md:grid md:grid-cols-5 md:gap-8 items-start pixel-on-scroll ${howItWorksVisible ? 'visible' : ''} pixel-delay-1`}>
              <div className='hidden md:block col-span-1 text-right pt-1'>
                <span className='text-4xl font-bold text-text-muted/30 pixel-number-count'>
                  01
                </span>
              </div>
              <div className='absolute -left-[5px] md:static md:col-span-4 pl-8 md:pl-0'>
                <div className='absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-accent md:hidden pixel-icon-pulse'></div>
                <h3 className='font-pixel text-base text-text mb-2'>
                  {t("step1Title")}
                </h3>
                <p className='text-lg text-text-muted'>{t("step1Desc")}</p>
              </div>
            </div>

            <div className={`relative md:grid md:grid-cols-5 md:gap-8 items-start pixel-on-scroll ${howItWorksVisible ? 'visible' : ''} pixel-delay-2`}>
              <div className='hidden md:block col-span-1 text-right pt-1'>
                <span className='text-4xl font-bold text-text-muted/30 pixel-number-count'>
                  02
                </span>
              </div>
              <div className='absolute -left-[5px] md:static md:col-span-4 pl-8 md:pl-0'>
                <div className='absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-cream md:hidden pixel-icon-pulse'></div>
                <h3 className='font-pixel text-base text-text mb-2'>
                  {t("step2Title")}
                </h3>
                <p className='text-lg text-text-muted'>{t("step2Desc")}</p>
              </div>
            </div>

            <div className={`relative md:grid md:grid-cols-5 md:gap-8 items-start pixel-on-scroll ${howItWorksVisible ? 'visible' : ''} pixel-delay-3`}>
              <div className='hidden md:block col-span-1 text-right pt-1'>
                <span className='text-4xl font-bold text-text-muted/30 pixel-number-count'>
                  03
                </span>
              </div>
              <div className='absolute -left-[5px] md:static md:col-span-4 pl-8 md:pl-0'>
                <div className='absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-cream md:hidden pixel-icon-pulse'></div>
                <h3 className='font-pixel text-base text-text mb-2'>
                  {t("step3Title")}
                </h3>
                <p className='text-lg text-text-muted'>{t("step3Desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id='pricing' ref={pricingRef} className='py-32 max-w-7xl mx-auto px-6'>
        <div className={`text-center mb-20 pixel-on-scroll ${pricingVisible ? 'visible' : ''}`}>
          <h2 className='font-pixel text-3xl md:text-4xl tracking-tight mb-6 text-text'>
            {t("pricingTitle")}
          </h2>
          <p className='text-xl text-text-muted'>{t("pricingSubtitle")}</p>
        </div>

        <div className='grid md:grid-cols-3 gap-8 items-start'>
          <div className={`p-8 rounded-2xl border border-border bg-surface-elevated relative pixel-card-hover pixel-on-scroll ${pricingVisible ? 'visible' : ''} pixel-delay-1`}>
            <h3 className='font-pixel text-base mb-2 text-text'>
              {t("tierFreeName")}
            </h3>
            <div className='text-4xl font-semibold tracking-tight mb-6 text-text'>
              {t("tierFreePrice")}{" "}
              <span className='text-base font-normal text-text-muted'>
                {t("tierFreePeriod")}
              </span>
            </div>
            <ul className='space-y-4 text-text-muted mb-8 text-lg'>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-teal shrink-0' />
                {t("tierFree1")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-teal shrink-0' />
                {t("tierFree2")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-teal shrink-0' />
                {t("tierFree3")}
              </li>
            </ul>
            <Link
              href="/auth"
              className='w-full py-3 rounded-lg border border-border-strong hover:bg-surface transition-colors font-medium text-text inline-block text-center'
            >
              {t("tierFreeCta")}
            </Link>
          </div>

          <div className={`p-8 rounded-2xl bg-teal border border-teal shadow-xl relative transform md:-translate-y-4 pixel-card-hover pixel-on-scroll ${pricingVisible ? 'visible' : ''} pixel-delay-2`}>
            <div className='absolute top-0 right-0 bg-accent text-text-inverse text-xs font-semibold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wide pixel-badge-blink'>
              {t("tierBasicBadge")}
            </div>
            <h3 className='font-pixel text-base mb-2 text-text-inverse'>
              {t("tierBasicName")}
            </h3>
            <div className='text-4xl font-semibold tracking-tight mb-6 text-text-inverse'>
              {t("tierBasicPrice")}{" "}
              <span className='text-base font-normal text-text-inverse/70'>
                {t("tierBasicPeriod")}
              </span>
            </div>
            <ul className='space-y-4 text-text-inverse/90 mb-8 text-lg'>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierBasic1")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierBasic2")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierBasic3")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierBasic4")}
              </li>
            </ul>
            <Link
              href="/waitlist"
              className='w-full py-3 rounded-lg bg-accent text-text-inverse hover:bg-accent-hover transition-colors font-medium shadow-lg inline-block text-center'
            >
              {t("tierBasicCta")}
            </Link>
          </div>

          <div className={`p-8 rounded-2xl bg-plum border border-plum/80 relative overflow-hidden pixel-card-hover pixel-on-scroll ${pricingVisible ? 'visible' : ''} pixel-delay-3`}>
            <div className='absolute top-0 left-0 w-full h-1 bg-linear-to-r from-accent to-cream pixel-glow'></div>
            <h3 className='font-pixel text-base mb-2 text-cream'>
              {t("tierProName")}
            </h3>
            <div className='text-4xl font-semibold tracking-tight mb-6 text-cream'>
              {t("tierProPrice")}{" "}
              <span className='text-base font-normal text-cream/70'>
                {t("tierProPeriod")}
              </span>
            </div>
            <ul className='space-y-4 text-cream/90 mb-8 text-lg'>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierPro1")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                <span className='font-semibold text-text-inverse'>
                  {t("tierPro2")}
                </span>
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierPro3")}
              </li>
              <li className='flex gap-3'>
                <Check className='w-5 h-5 text-cream shrink-0' />
                {t("tierPro4")}
              </li>
            </ul>
            <Link
              href="/waitlist"
              className='w-full py-3 rounded-lg bg-cream text-plum hover:bg-white transition-colors font-medium inline-block text-center'
            >
              {t("tierProCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='py-12 border-t border-border text-center'>
        <div className='flex items-center justify-center gap-2 mb-6'>
          <Gamepad2 className='w-5 h-5 text-accent pixel-icon-pulse' />
          <span className='font-pixel text-base tracking-tight'>PixelMeet</span>
        </div>
        <p className='text-text-muted text-sm'>
          {t("footerCopyright", {
            year: new Date().getFullYear(),
          })}
        </p>
      </footer>
    </main>
  );
}
