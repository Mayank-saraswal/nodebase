"use client";

import { ChevronRight, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Navigation data                                                    */
/* ------------------------------------------------------------------ */

interface NavItem {
  title: string;
  href: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Quick Start", href: "/docs/getting-started" },
      { title: "Core Concepts", href: "/docs/getting-started#core-concepts" },
    ],
  },
  {
    title: "All Nodes",
    items: [
      { title: "Overview", href: "/docs/nodes" },
    ],
  },
  {
    title: "Triggers",
    items: [
      { title: "Manual Trigger", href: "/docs/nodes#manual-trigger" },
      { title: "Webhook Trigger", href: "/docs/nodes/webhook-trigger" },
      { title: "Schedule Trigger", href: "/docs/nodes/schedule-trigger" },
      { title: "Razorpay Trigger", href: "/docs/nodes/razorpay-trigger" },
      { title: "WhatsApp Trigger", href: "/docs/nodes/whatsapp-trigger" },
      { title: "Error Trigger", href: "/docs/nodes/error-trigger" },
      { title: "Google Form Trigger", href: "/docs/nodes#google-form-trigger" },
      { title: "Stripe Trigger", href: "/docs/nodes#stripe-trigger" },
    ],
  },
  {
    title: "India Stack",
    items: [
      { title: "MSG91", href: "/docs/nodes/msg91" },
      { title: "Shiprocket", href: "/docs/nodes/shiprocket" },
      { title: "Razorpay", href: "/docs/nodes/razorpay" },
    ],
  },
  {
    title: "AI Nodes",
    items: [
      { title: "AI Nodes Overview", href: "/docs/nodes/ai" },
      { title: "OpenAI", href: "/docs/nodes/ai#openai" },
      { title: "Anthropic", href: "/docs/nodes/ai#anthropic" },
      { title: "Gemini", href: "/docs/nodes/ai#gemini" },
      { title: "Groq", href: "/docs/nodes/ai#groq" },
      { title: "DeepSeek", href: "/docs/nodes/ai#deepseek" },
      { title: "Perplexity", href: "/docs/nodes/ai#perplexity" },
      { title: "xAI (Grok)", href: "/docs/nodes/ai#xai" },
    ],
  },
  {
    title: "Messaging",
    items: [
      { title: "WhatsApp", href: "/docs/nodes/whatsapp" },
      { title: "Slack", href: "/docs/nodes/slack" },
      { title: "Gmail", href: "/docs/nodes/gmail" },
      { title: "Discord", href: "/docs/nodes#discord" },
      { title: "Telegram", href: "/docs/nodes#telegram" },
      { title: "X (Twitter)", href: "/docs/nodes#x-twitter" },
    ],
  },
  {
    title: "Google Workspace",
    items: [
      { title: "Google Sheets", href: "/docs/nodes/google-sheets" },
      { title: "Google Drive", href: "/docs/nodes#google-drive" },
    ],
  },
  {
    title: "Productivity",
    items: [
      { title: "Notion", href: "/docs/nodes/notion" },
      { title: "Workday", href: "/docs/nodes#workday" },
    ],
  },
  {
    title: "Logic & Flow",
    items: [
      { title: "If / Else", href: "/docs/nodes/if-else" },
      { title: "Switch", href: "/docs/nodes/switch" },
      { title: "Loop", href: "/docs/nodes/loop" },
      { title: "Wait", href: "/docs/nodes/wait" },
      { title: "Merge", href: "/docs/nodes/merge" },
      { title: "Set Variable", href: "/docs/nodes/set-variable" },
    ],
  },
  {
    title: "Developer Tools",
    items: [
      { title: "HTTP Request", href: "/docs/nodes/http-request" },
      { title: "Code", href: "/docs/nodes/code" },
    ],
  },
  {
    title: "Guides",
    items: [
      {
        title: "Building Your First Workflow",
        href: "/docs/getting-started#quick-start",
      },
      {
        title: "Using Template Variables",
        href: "/docs/getting-started#template-variables",
      },
      {
        title: "Credential Management",
        href: "/docs/getting-started#credentials",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Flat ordered list for prev/next                                    */
/* ------------------------------------------------------------------ */

const flatPages = sections.flatMap((s) =>
  s.items.filter((i) => !i.href.includes("#")),
);

export function usePrevNext() {
  const pathname = usePathname();
  const idx = flatPages.findIndex((p) => p.href === pathname);
  return {
    prev: idx > 0 ? flatPages[idx - 1] : null,
    next: idx < flatPages.length - 1 ? flatPages[idx + 1] : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Right‐side TOC (auto‐generated from headings)                     */
/* ------------------------------------------------------------------ */

interface Heading {
  id: string;
  text: string;
  level: number;
}

function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        "#docs-content h2, #docs-content h3",
      ),
    ).filter((el) => !!el.id);

    setHeadings(
      els.map((el) => ({
        id: el.id,
        text: el.textContent ?? "",
        level: Number(el.tagName[1]),
      })),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0.1 },
    );

    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      {headings.map((h, idx) => (
        <a
          key={`${h.id}-${idx}`}
          href={`#${h.id}`}
          className={cn(
            "block truncate py-1 text-xs transition-colors",
            h.level === 3 && "pl-3",
            activeId === h.id
              ? "font-medium text-orange"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Left sidebar                                                       */
/* ------------------------------------------------------------------ */

function Sidebar({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (q: string) => void;
}) {
  const pathname = usePathname();
  const lc = query.toLowerCase();

  const filtered = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.title.toLowerCase().includes(lc)),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <aside className="flex h-full flex-col">
      {/* Logo link */}
      <Link
        href="/"
        className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight"
      >
        <span className="text-orange">Nodebase</span>
        <span className="text-muted-foreground">Docs</span>
      </Link>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search docs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-muted/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-orange/40 focus:ring-2 focus:ring-orange/20"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-6 overflow-y-auto pb-8">
        {filtered.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/docs" &&
                    !item.href.includes("#") &&
                    pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive
                          ? "border-l-2 border-orange bg-orange-subtle font-medium text-orange"
                          : "text-muted-foreground hover:bg-orange-subtle hover:text-foreground",
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Docs Shell (exported layout wrapper)                               */
/* ------------------------------------------------------------------ */

export function DocsShell({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close mobile drawer on route change
  const pathname = usePathname();
  // biome-ignore lint/correctness/useExhaustiveDependencies: close on route change
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* ---- Mobile hamburger ---- */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-background p-2 shadow-sm lg:hidden"
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* ---- Mobile overlay ---- */}
      {mobileOpen && (
        <button
          type="button"
          tabIndex={0}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobile}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeMobile();
          }}
          aria-label="Close sidebar"
        />
      )}

      {/* ---- Left sidebar ---- */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] shrink-0 border-r border-border bg-background px-4 pt-6 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar query={query} setQuery={setQuery} />
      </div>

      {/* ---- Main + right TOC ---- */}
      <div className="flex min-w-0 flex-1">
        {/* Main content */}
        <main id="docs-content" className="flex-1 px-6 py-10 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>

        {/* Right TOC */}
        <div className="hidden w-[200px] shrink-0 pt-10 pr-6 xl:block">
          <div className="sticky top-10">
            <TableOfContents />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Prev / Next links                                                  */
/* ------------------------------------------------------------------ */

export function PrevNextLinks() {
  const { prev, next } = usePrevNext();

  if (!prev && !next) return null;

  return (
    <div className="mt-16 flex items-center justify-between border-t border-border pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-orange"
        >
          <ChevronRight className="size-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-orange"
        >
          {next.title}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Breadcrumb                                                         */
/* ------------------------------------------------------------------ */

export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link href="/docs" className="transition-colors hover:text-orange">
        Docs
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" />
          {item.href ? (
            <Link
              href={item.href}
              className="transition-colors hover:text-orange"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
