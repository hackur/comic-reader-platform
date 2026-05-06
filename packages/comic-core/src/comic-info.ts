export interface ComicInfoPage {
  image: number;
  type?: string;
  doublePage?: boolean;
}

export interface ComicInfo {
  series?: string;
  number?: string;
  volume?: string;
  title?: string;
  summary?: string;
  pageCount?: number;
  year?: number;
  month?: number;
  writer?: string;
  penciller?: string;
  publisher?: string;
  genre?: string;
  languageISO?: string;
  ageRating?: string;
  notes?: string;
  pages?: ComicInfoPage[];
}

function getDOMParserCtor(): typeof DOMParser | undefined {
  if (typeof DOMParser !== "undefined") return DOMParser;
  const g = globalThis as unknown as { DOMParser?: typeof DOMParser };
  return g.DOMParser;
}

function textOf(root: Element, tag: string): string | undefined {
  // ComicInfo.xml uses PascalCase tags at the top level.
  const node = root.getElementsByTagName(tag)[0];
  if (!node) return undefined;
  const txt = node.textContent;
  if (txt == null) return undefined;
  const trimmed = txt.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function intOf(root: Element, tag: string): number | undefined {
  const v = textOf(root, tag);
  if (v == null) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(v: string | null | undefined): boolean | undefined {
  if (v == null) return undefined;
  const t = v.trim().toLowerCase();
  if (t === "true" || t === "1" || t === "yes") return true;
  if (t === "false" || t === "0" || t === "no") return false;
  return undefined;
}

/**
 * Parse a ComicInfo.xml document. Browser-only: relies on DOMParser. In
 * Node, polyfill DOMParser (e.g. via `linkedom` or `@xmldom/xmldom`) before
 * calling.
 */
export function parseComicInfoXml(xml: string): ComicInfo {
  const Ctor = getDOMParserCtor();
  if (!Ctor) {
    throw new Error(
      "parseComicInfoXml requires a DOMParser. Run in a browser, or polyfill globalThis.DOMParser (e.g. @xmldom/xmldom, linkedom) before calling.",
    );
  }
  const doc = new Ctor().parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (!root) {
    throw new Error("parseComicInfoXml: empty document");
  }
  // Surface XML parse errors when present.
  const parseError = doc.getElementsByTagName("parsererror")[0];
  if (parseError) {
    throw new Error(`parseComicInfoXml: ${parseError.textContent ?? "parse error"}`);
  }

  const info: ComicInfo = {
    series: textOf(root, "Series"),
    number: textOf(root, "Number"),
    volume: textOf(root, "Volume"),
    title: textOf(root, "Title"),
    summary: textOf(root, "Summary"),
    pageCount: intOf(root, "PageCount"),
    year: intOf(root, "Year"),
    month: intOf(root, "Month"),
    writer: textOf(root, "Writer"),
    penciller: textOf(root, "Penciller"),
    publisher: textOf(root, "Publisher"),
    genre: textOf(root, "Genre"),
    languageISO: textOf(root, "LanguageISO"),
    ageRating: textOf(root, "AgeRating"),
    notes: textOf(root, "Notes"),
  };

  const pagesEl = root.getElementsByTagName("Pages")[0];
  if (pagesEl) {
    const pageNodes = pagesEl.getElementsByTagName("Page");
    const pages: ComicInfoPage[] = [];
    for (let i = 0; i < pageNodes.length; i++) {
      const p = pageNodes[i]!;
      const imageAttr = p.getAttribute("Image");
      const imageNum = imageAttr != null ? Number.parseInt(imageAttr, 10) : NaN;
      if (!Number.isFinite(imageNum)) continue;
      const page: ComicInfoPage = { image: imageNum };
      const type = p.getAttribute("Type");
      if (type) page.type = type;
      const dp = parseBool(p.getAttribute("DoublePage"));
      if (dp !== undefined) page.doublePage = dp;
      pages.push(page);
    }
    if (pages.length > 0) info.pages = pages;
  }

  return info;
}
