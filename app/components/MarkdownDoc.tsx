"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { useState } from "react";

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (older browsers, insecure contexts) — silently no-op
    }
  }

  return (
    <span className="inline-flex items-center gap-1 align-baseline">
      <code className="font-mono text-[0.92em] bg-bg-elev px-1.5 py-0.5 rounded border border-line">
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy address"
        className="text-fg-faint hover:text-fg transition-colors text-[10px] font-mono px-1 py-0.5 rounded border border-line hover:border-line-strong"
      >
        {copied ? "✓" : "Copy"}
      </button>
    </span>
  );
}

const components: Components = {
  h1: (props) => (
    <h1
      {...props}
      className="text-2xl sm:text-3xl font-semibold tracking-tight mt-10 mb-4 scroll-mt-20"
    />
  ),
  h2: (props) => (
    <h2
      {...props}
      className="text-xl sm:text-2xl font-semibold tracking-tight mt-10 mb-3 pt-2 border-t border-line scroll-mt-20"
    />
  ),
  h3: (props) => (
    <h3
      {...props}
      className="text-base sm:text-lg font-semibold mt-6 mb-2 text-fg scroll-mt-20"
    />
  ),
  h4: (props) => (
    <h4
      {...props}
      className="text-[15px] font-semibold mt-5 mb-2 text-fg-dim scroll-mt-20"
    />
  ),
  p: (props) => (
    <p {...props} className="my-4 leading-relaxed text-fg-dim text-[15px]" />
  ),
  ul: (props) => (
    <ul
      {...props}
      className="list-disc pl-6 my-4 space-y-1.5 text-fg-dim text-[15px]"
    />
  ),
  ol: (props) => (
    <ol
      {...props}
      className="list-decimal pl-6 my-4 space-y-1.5 text-fg-dim text-[15px]"
    />
  ),
  li: (props) => <li {...props} className="leading-relaxed" />,
  strong: (props) => <strong {...props} className="text-fg font-semibold" />,
  em: (props) => <em {...props} className="italic" />,
  a: (props) => (
    <a
      {...props}
      className="text-accent hover:underline break-words"
      target={props.href?.startsWith("http") ? "_blank" : undefined}
      rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...props}
      className="border-l-2 border-accent/40 pl-4 my-4 text-fg-dim italic"
    />
  ),
  hr: () => <hr className="my-8 border-line" />,
  table: (props) => (
    <div className="my-6 overflow-x-auto rounded border border-line">
      <table {...props} className="w-full text-[14px] border-collapse" />
    </div>
  ),
  thead: (props) => <thead {...props} className="bg-bg-elev text-fg" />,
  tbody: (props) => <tbody {...props} className="divide-y divide-line" />,
  tr: (props) => <tr {...props} className="align-top" />,
  th: (props) => (
    <th
      {...props}
      className="px-3 py-2 text-left font-semibold border-r last:border-r-0 border-line"
    />
  ),
  td: (props) => (
    <td
      {...props}
      className="px-3 py-2 border-r last:border-r-0 border-line text-fg-dim"
    />
  ),
  code: ({ className, children, ...rest }) => {
    const isInline = !className;
    const text = String(children ?? "").trim();
    if (isInline && ETH_ADDRESS_RE.test(text)) {
      return <CopyableCode value={text} />;
    }
    if (isInline) {
      return (
        <code
          {...rest}
          className="font-mono text-[0.92em] bg-bg-elev px-1.5 py-0.5 rounded border border-line"
        >
          {children}
        </code>
      );
    }
    return (
      <code {...rest} className={className}>
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre
      {...props}
      className="my-4 overflow-x-auto rounded border border-line bg-bg-elev p-3 text-[13px] font-mono text-fg-dim"
    />
  ),
};

export function MarkdownDoc({ source }: { source: string }) {
  return (
    <article className="legal-doc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
