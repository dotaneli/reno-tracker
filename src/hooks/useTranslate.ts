"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Translates an array of user-generated strings into the active language.
 * Works in ALL directions — content can be in any language, translates to any target.
 * Returns a function: (original) => translated.
 */
export function useTranslate(texts: string[]) {
  const { lang } = useI18n();
  const [map, setMap] = useState<Map<string, string>>(new Map());
  const cache = useRef<Map<string, string>>(new Map());

  const textsKey = useMemo(() => {
    const valid = texts.filter(Boolean);
    return valid.sort().join("\n");
  }, [texts]);

  const translate = useCallback(
    async (toTranslate: string[], targetLang: string) => {
      // Always translate — content can be in any language
      const uncached = toTranslate.filter(
        (t) => t && !cache.current.has(`${targetLang}:${t}`)
      );

      if (uncached.length > 0) {
        try {
          const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: uncached, to: targetLang }),
          });
          if (res.ok) {
            const { translations } = await res.json();
            uncached.forEach((original, i) => {
              cache.current.set(`${targetLang}:${original}`, translations[i]);
            });
          }
        } catch {
          // Silently fail — original text will be shown
        }
      }

      const result = new Map<string, string>();
      toTranslate.forEach((t) => {
        result.set(t, cache.current.get(`${targetLang}:${t}`) || t);
      });
      return result;
    },
    []
  );

  useEffect(() => {
    const validTexts = texts.filter(Boolean);
    if (validTexts.length === 0) return;
    translate(validTexts, lang).then(setMap);
  }, [textsKey, lang, translate]);

  return (text: string) => map.get(text) || text;
}
