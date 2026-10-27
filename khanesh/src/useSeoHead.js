import { useEffect } from "react";
import { BRAND_FA } from "./Logo.jsx";

export const SITE_ORIGIN = "https://azmayarapp.ir";

function setMeta(key, value, isProperty = false) {
  if (typeof document === "undefined") return;
  const attr = isProperty ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!value) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setCanonical(href) {
  if (typeof document === "undefined") return;
  let el = document.querySelector('link[rel="canonical"]');
  if (!href) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(data) {
  if (typeof document === "undefined") return;
  let el = document.getElementById("seo-jsonld");
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("id", "seo-jsonld");
    document.head.appendChild(el);
  }
  el.textContent = typeof data === "string" ? data : JSON.stringify(data);
}

/**
 * مدیریتِ سربرگ‌های صفحه (Title, Canonical, Meta, OG, JSON-LD) به‌صورت per-route.
 * جلوگیری از یکی‌شدنِ canonical در کلِ اپلیکیشن و بهبودِ ایندکسِ موتورهای جست‌وجو.
 */
export function useSeoHead({
  title,
  description,
  canonical,
  robots = "index,follow",
  ogType = "website",
  jsonLd,
}) {
  const jsonLdStr = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    // ۱. تیترِ صفحه با پسوندِ برند (بدون تکرار)
    const cleanTitle = (title || "").trim();
    const fullTitle = !cleanTitle
      ? `${BRAND_FA} (AzmayarApp) — تفسیر آزمایش`
      : cleanTitle.includes(BRAND_FA)
        ? cleanTitle
        : `${cleanTitle} — ${BRAND_FA}`;
    document.title = fullTitle;

    // ۲. نشانیِ کانونیکال (Canonical) و og:url
    let fullCanonical = canonical;
    if (fullCanonical && fullCanonical.startsWith("/")) {
      fullCanonical = `${SITE_ORIGIN}${fullCanonical}`;
    } else if (!fullCanonical && typeof window !== "undefined") {
      fullCanonical = `${SITE_ORIGIN}${window.location.pathname}`;
    }
    setCanonical(fullCanonical);
    setMeta("og:url", fullCanonical, true);

    // ۳. توضیحات (Description)
    if (description) {
      const cleanDesc = description.replace(/\s+/g, " ").trim().slice(0, 180);
      setMeta("description", cleanDesc);
      setMeta("og:description", cleanDesc, true);
    }

    // ۴. متاتگ‌های OpenGraph
    setMeta("og:title", fullTitle, true);
    setMeta("og:type", ogType || "website", true);
    setMeta("og:site_name", BRAND_FA, true);
    setMeta("og:locale", "fa_IR", true);

    // ۵. ربات‌ها (Robots)
    setMeta("robots", robots || "index,follow");

    // ۶. داده‌های ساخت‌یافته (JSON-LD)
    setJsonLd(jsonLdStr);
  }, [title, description, canonical, robots, ogType, jsonLdStr]);
}

export function SeoHead(props) {
  useSeoHead(props);
  return null;
}
