"use client";
import { useState, useEffect } from "react";

export function useLang() {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const stored = localStorage.getItem("book_lang");
    if (stored === "pt" || stored === "en") setLangState(stored);
  }, []);

  function setLang(l) {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("book_lang", l);
    }
  }

  return [lang, setLang];
}
