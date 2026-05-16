"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useAccount, useDisconnect } from "wagmi";

import type { SupportedLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-dictionary";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal-locale";

const STORAGE_KEY = "scentdex.terms.acceptance";

type Acceptance = {
  terms: string;
  privacy: string;
  acceptedAt: string;
};

function readAcceptance(): Acceptance | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Acceptance;
    if (
      typeof parsed.terms !== "string" ||
      typeof parsed.privacy !== "string" ||
      typeof parsed.acceptedAt !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isCurrentAcceptance(a: Acceptance | null): boolean {
  return (
    a !== null && a.terms === TERMS_VERSION && a.privacy === PRIVACY_VERSION
  );
}

// Tiny external store backed by localStorage. We use this with
// useSyncExternalStore so reads return a stable reference each render (no
// infinite loops) and writes notify all mounted instances synchronously — no
// useEffect / setState dance required.
let cachedAcceptance: Acceptance | null =
  typeof window === "undefined" ? null : readAcceptance();
const acceptanceListeners = new Set<() => void>();

function subscribeAcceptance(cb: () => void): () => void {
  acceptanceListeners.add(cb);
  return () => {
    acceptanceListeners.delete(cb);
  };
}

function getAcceptanceSnapshot(): Acceptance | null {
  return cachedAcceptance;
}

function getServerAcceptanceSnapshot(): Acceptance | null {
  return null;
}

function persistAcceptance(value: Acceptance): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  cachedAcceptance = value;
  acceptanceListeners.forEach((cb) => cb());
}

export function TermsAcceptanceModal({ locale }: { locale: SupportedLocale }) {
  const t = getTranslator(locale);
  const { status } = useAccount();
  const { disconnect } = useDisconnect();
  const [checked, setChecked] = useState(false);

  const storedAcceptance = useSyncExternalStore(
    subscribeAcceptance,
    getAcceptanceSnapshot,
    getServerAcceptanceSnapshot,
  );

  if (status !== "connected") return null;
  if (isCurrentAcceptance(storedAcceptance)) return null;

  const revisedFromOlder = storedAcceptance !== null;

  function onAccept() {
    if (!checked) return;
    persistAcceptance({
      terms: TERMS_VERSION,
      privacy: PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
    });
    setChecked(false);
  }

  function onCancel() {
    disconnect();
    setChecked(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 print:hidden"
    >
      <div className="w-full max-w-md rounded-lg border border-line-strong bg-bg-soft shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <h2
          id="terms-modal-title"
          className="text-lg font-semibold text-fg mb-3"
        >
          {t("terms.modal.title")}
        </h2>
        {revisedFromOlder ? (
          <p className="text-[13px] text-accent mb-3">
            {t("terms.modal.revisionNotice").replace("{date}", TERMS_VERSION)}
          </p>
        ) : null}
        <p className="text-[14px] text-fg-dim leading-relaxed mb-4">
          {t("terms.modal.body")}
        </p>

        <div className="flex flex-col gap-1.5 mb-4 text-[13px]">
          <Link
            href="/terms"
            target="_blank"
            rel="noopener"
            className="text-accent hover:underline"
          >
            {t("terms.modal.viewTerms")} ↗
          </Link>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener"
            className="text-accent hover:underline"
          >
            {t("terms.modal.viewPrivacy")} ↗
          </Link>
        </div>

        <label className="flex items-start gap-2 cursor-pointer mb-5 text-[14px] text-fg-dim">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 accent-accent shrink-0"
          />
          <span>{t("terms.modal.checkbox")}</span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-line text-[13px] text-fg-dim hover:text-fg hover:border-line-strong transition-colors"
          >
            {t("terms.modal.cancel")}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!checked}
            className="px-4 py-2 rounded-md bg-accent text-bg text-[13px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
          >
            {t("terms.modal.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
