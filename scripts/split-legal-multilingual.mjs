#!/usr/bin/env node
// Splits each multilingual legal doc under content/legal/source/ into four
// per-language Markdown files (en/ja/id/zh) that the /terms and /privacy
// pages read at request time. Run after the UST legal team updates the
// multilingual source.
//
//   npm run legal:split

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const SRC = path.join(ROOT, "content/legal/source");
const DEST = path.join(ROOT, "content/legal");

const DOCS = [
  { source: "terms-v0.2-multilingual.md", basename: "terms" },
  { source: "privacy-v0.1-multilingual.md", basename: "privacy" },
];

const FLAG_TO_CODE = {
  "🇬🇧": "en",
  "🇯🇵": "ja",
  "🇮🇩": "id",
  "🇨🇳": "zh",
};

const HEADING_RE = /^# (🇬🇧|🇯🇵|🇮🇩|🇨🇳)[^\n]*$/gm;

function splitOne({ source, basename }) {
  const srcPath = path.join(SRC, source);
  const raw = fs.readFileSync(srcPath, "utf-8");

  const matches = [...raw.matchAll(HEADING_RE)];
  if (matches.length !== 4) {
    throw new Error(
      `${source}: expected 4 flag headings, found ${matches.length}`,
    );
  }

  const results = {};
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const code = FLAG_TO_CODE[m[1]];
    const start = m.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    let section = raw.slice(start, end);
    section = section.replace(/^# (🇬🇧|🇯🇵|🇮🇩|🇨🇳)[^\n]*\n+/, "");
    section = section.replace(/\n+---\n---\s*$/, "");
    section = section.trim() + "\n";
    results[code] = section;
  }

  for (const code of Object.values(FLAG_TO_CODE)) {
    if (!results[code]) {
      throw new Error(`${source}: missing locale ${code}`);
    }
    const outPath = path.join(DEST, `${basename}-${code}.md`);
    fs.writeFileSync(outPath, results[code], "utf-8");
    console.log(
      `wrote ${path.relative(ROOT, outPath)} (${results[code].length} chars)`,
    );
  }
}

for (const doc of DOCS) splitOne(doc);
