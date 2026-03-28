"use client";

import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { signInWithGoogle } from "./actions";

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />

      {/* Lang toggle */}
      <div className="absolute end-5 top-5 z-20">
        <LangToggle />
      </div>

      {/* Frosted glass card */}
      <div className="relative z-10 mx-4 w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-8 py-10 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <div className="h-5 w-5 rounded-md bg-[#B8956A]" />
          </div>

          {/* Title */}
          <div className="mb-8 space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {t("login.title")}
            </h1>
            <p className="text-sm text-white/60">{t("login.subtitle")}</p>
          </div>

          {/* Sign in */}
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3.5 text-sm font-medium text-[#2D2926] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t("login.signIn")}
            </button>
          </form>
        </div>

        {/* Tagline below card */}
        <p className="mt-6 text-center text-xs text-white/30">
          {t("login.tagline")}
        </p>
      </div>
    </div>
  );
}
