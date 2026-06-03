"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  Menu,
  Plug,
  Repeat,
  Terminal,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Nodes", href: "/docs/nodes" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "#pricing" },
];

const STATS = [
  "50+ integrations",
  "10x faster than n8n",
  "Built for India",
  "Free forever plan",
];

const NODES_GRID = [
  { name: "WhatsApp", logo: "/logos/whatsapp.svg", featured: true },
  { name: "Notion", logo: "/logos/notion.svg", featured: false },
  {
    name: "Razorpay",
    logo: null,
    letter: "R",
    color: "#2B84EA",
    featured: true,
  },
  { name: "Gmail", logo: "/logos/gmail.svg", featured: false },
  { name: "Google Sheets", logo: "/logos/googlesheets.svg", featured: false },
  { name: "Google Drive", logo: "/logos/google-drive.svg", featured: false },
  {
    name: "HTTP Request",
    logo: null,
    icon: "globe",
    color: "#525252",
    featured: false,
  },
  {
    name: "Loop",
    logo: null,
    icon: "repeat",
    color: "#525252",
    featured: false,
  },
  {
    name: "Code",
    logo: null,
    icon: "terminal",
    color: "#525252",
    featured: false,
  },
  { name: "Slack", logo: "/logos/slack.svg", featured: false },
  { name: "Telegram", logo: "/logos/telegram.svg", featured: false },
  { name: "GitHub", logo: "/logos/github.svg", featured: false },
];

const STEPS = [
  {
    icon: Plug,
    title: "Connect your apps",
    description:
      "Add credentials for your tools in one place. Razorpay, WhatsApp, Gmail, Notion — all secure.",
  },
  {
    icon: Workflow,
    title: "Build your workflow",
    description:
      "Drag, drop, and connect nodes on our visual canvas. No code needed. Templates available.",
  },
  {
    icon: Zap,
    title: "Execute and automate",
    description:
      "Trigger workflows manually, on schedule, or via webhooks. Watch them run in real time.",
  },
];

const INDIA_FEATURES = [
  {
    emoji: "🇮🇳",
    title: "Native Razorpay",
    description:
      "Create orders, capture payments, verify signatures, manage subscriptions — all without code.",
  },
  {
    emoji: "💬",
    title: "WhatsApp Business API",
    description:
      "Send transactional messages, order confirmations, and customer updates via WhatsApp Cloud API.",
  },
  {
    emoji: "📊",
    title: "Real-time Execution",
    description:
      "Watch your workflows execute step by step with live status updates on every node.",
  },
  {
    emoji: "🔐",
    title: "Secure Credentials",
    description:
      "All API keys encrypted at rest. Role-based access. Your data never leaves your account.",
  },
];

const USE_CASES = [
  {
    category: "E-commerce",
    title: "Automate order fulfillment",
    flow: ["Razorpay", "Google Sheets", "WhatsApp"],
    description:
      "When payment is received, add to tracker and send WhatsApp confirmation instantly.",
  },
  {
    category: "SaaS",
    title: "User onboarding automation",
    flow: ["Webhook", "Notion", "Gmail"],
    description:
      "New signup creates Notion record and triggers welcome email sequence automatically.",
  },
  {
    category: "Operations",
    title: "Daily reports on autopilot",
    flow: ["Schedule", "Google Sheets", "WhatsApp"],
    description:
      "Every morning at 9AM, compile yesterday's data and send summary to your team.",
  },
];

const PRICING_TIERS = [
  {
    title: "Free",
    price: "₹0",
    sub: "/month",
    features: [
      "100 workflow runs/month",
      "5 workflows",
      "All nodes included",
      "Community support",
    ],
    featured: false,
    cta: "Start free",
  },
  {
    title: "Starter",
    price: "₹999",
    sub: "/month",
    features: [
      "10,000 workflow runs/month",
      "50 workflows",
      "Email support",
      "All triggers",
    ],
    featured: false,
    cta: "Subscribe Now",
  },
  {
    title: "Pro",
    price: "₹2,499",
    sub: "/month",
    features: [
      "100,000 workflow runs/month",
      "Unlimited workflows",
      "Priority support",
      "API access",
    ],
    featured: true,
    cta: "Go Pro",
  },
  {
    title: "Team",
    price: "₹5,999",
    sub: "/month",
    features: [
      "500,000 workflow runs/month",
      "Unlimited workflows",
      "Team collaboration",
      "SLA guarantee",
    ],
    featured: false,
    cta: "Contact Sales",
  },
];

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Nodes", href: "#nodes" },
      { label: "Pricing", href: "#pricing" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Docs",
    links: [
      { label: "Getting Started", href: "#" },
      { label: "Nodes", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Tutorials", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Twitter", href: "#" },
      { label: "GitHub", href: "#" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   EXECUTION LOG LINES
   ═══════════════════════════════════════════════════════════════════════════════ */
const LOG_LINES = [
  { text: "Razorpay webhook received", time: 2 },
  { text: "Payment verified (₹2,499)", time: 2.5 },
  { text: "Notion row updated", time: 4 },
  { text: "WhatsApp sent to +91XXXXXXXX", time: 6 },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL HOOK
   ═══════════════════════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   NODE ICON HELPER
   ═══════════════════════════════════════════════════════════════════════════════ */
function NodeIcon({ node }: { node: (typeof NODES_GRID)[number] }) {
  if (node.logo) {
    return (
      <Image
        src={node.logo}
        alt={node.name}
        width={40}
        height={40}
        className="h-10 w-10 object-contain"
      />
    );
  }
  if (node.icon === "globe")
    return <Globe className="h-6 w-6 text-[#525252]" />;
  if (node.icon === "repeat")
    return <Repeat className="h-6 w-6 text-[#525252]" />;
  if (node.icon === "terminal")
    return <Terminal className="h-6 w-6 text-[#525252]" />;
  if (node.letter) {
    return (
      <span
        className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
        style={{ backgroundColor: node.color }}
      >
        {node.letter}
      </span>
    );
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: NAVBAR
   ═══════════════════════════════════════════════════════════════════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#E5E5E5] bg-white/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5">
          <span className="font-[family-name:var(--font-syne)] text-xl font-bold text-[#0A0A0A]">
            Nodebase
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#E8470A]" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="font-[family-name:var(--font-dm-sans)] text-sm font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/login"
            className="font-[family-name:var(--font-dm-sans)] text-sm font-medium text-[#525252] hover:text-[#0A0A0A]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-[#E8470A] px-4 py-2 font-[family-name:var(--font-dm-sans)] text-sm font-medium text-white transition-colors hover:bg-[#c93d09]"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6 text-[#0A0A0A]" />
          ) : (
            <Menu className="h-6 w-6 text-[#0A0A0A]" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-[#E5E5E5] bg-white px-6 pb-6 md:hidden">
          <div className="flex flex-col gap-4 pt-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="font-[family-name:var(--font-dm-sans)] text-base font-medium text-[#525252]"
              >
                {l.label}
              </Link>
            ))}
            <hr className="border-[#E5E5E5]" />
            <Link
              href="/sign-in"
              className="font-[family-name:var(--font-dm-sans)] text-base font-medium text-[#525252]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#E8470A] px-4 py-2.5 text-center font-[family-name:var(--font-dm-sans)] text-sm font-medium text-white"
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: HERO
   ═══════════════════════════════════════════════════════════════════════════════ */
function Hero() {
  const { ref, visible } = useScrollReveal();
  return (
    <section
      ref={ref}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-16"
    >
      {/* Noise/grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Geometric accent */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-[600px] w-[600px] rotate-12 rounded-3xl bg-[#E8470A] opacity-[0.04]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-[400px] w-[400px] -rotate-6 rounded-3xl bg-[#E8470A] opacity-[0.03]" />

      <div
        className={`relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-[#E8470A]" />
          <span className="font-[family-name:var(--font-dm-sans)] text-sm text-[#525252]">
            Now with Razorpay &amp; Notion nodes
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-[#525252]" />
        </div>

        {/* Headline */}
        <h1 className="font-[family-name:var(--font-syne)] text-5xl font-extrabold leading-[1.08] tracking-tight text-[#0A0A0A] md:text-7xl lg:text-[88px]">
          Automate anything.
          <br />
          No code required.
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-2xl font-[family-name:var(--font-dm-sans)] text-lg leading-relaxed text-[#525252] md:text-xl">
          Connect your apps, automate workflows, and scale your business. Built
          for Indian teams — with native Razorpay, WhatsApp, and GST-ready
          integrations.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-xl bg-[#E8470A] px-8 py-3.5 font-[family-name:var(--font-dm-sans)] text-base font-medium text-white shadow-lg shadow-[#E8470A]/20 transition-all hover:bg-[#c93d09] hover:shadow-xl hover:shadow-[#E8470A]/25"
          >
            Start building free
          </Link>
          <a
            href="#demo"
            className="group flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-8 py-3.5 font-[family-name:var(--font-dm-sans)] text-base font-medium text-[#525252] transition-all hover:border-[#E8470A]/30 hover:text-[#0A0A0A]"
          >
            See how it works
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      {/* Stat bar */}
      <div
        className={`relative z-10 mt-20 flex flex-wrap items-center justify-center gap-6 md:gap-12 transition-all duration-700 delay-300 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        {STATS.map((stat, i) => (
          <div key={stat} className="flex items-center gap-6">
            <span className="font-[family-name:var(--font-dm-sans)] text-sm font-medium text-[#525252]">
              {stat}
            </span>
            {i < STATS.length - 1 && (
              <span className="hidden h-4 w-px bg-[#E5E5E5] md:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: WORKFLOW DEMO ANIMATION
   ═══════════════════════════════════════════════════════════════════════════════ */
type NodeStatus = "idle" | "loading" | "success";

function WorkflowDemo() {
  const { ref, visible } = useScrollReveal();
  const [statuses, setStatuses] = useState<
    [NodeStatus, NodeStatus, NodeStatus]
  >(["idle", "idle", "idle"]);
  const [logIndex, setLogIndex] = useState(-1);
  const [dotPosition, setDotPosition] = useState<number>(-1);

  useEffect(() => {
    if (!visible) return;

    let timer: ReturnType<typeof setTimeout>;

    function runCycle() {
      // Reset
      setStatuses(["idle", "idle", "idle"]);
      setLogIndex(-1);
      setDotPosition(-1);

      // t=1s: Node 1 loading
      timer = setTimeout(() => {
        setStatuses(["loading", "idle", "idle"]);
      }, 1000);

      // t=2s: Node 1 success, dot starts
      setTimeout(() => {
        setStatuses(["success", "idle", "idle"]);
        setDotPosition(0);
        setLogIndex(0);
      }, 2000);

      setTimeout(() => {
        setLogIndex(1);
      }, 2500);

      // t=3s: Node 2 loading
      setTimeout(() => {
        setStatuses(["success", "loading", "idle"]);
        setDotPosition(-1);
      }, 3000);

      // t=4s: Node 2 success
      setTimeout(() => {
        setStatuses(["success", "success", "idle"]);
        setDotPosition(1);
        setLogIndex(2);
      }, 4000);

      // t=5s: Node 3 loading
      setTimeout(() => {
        setStatuses(["success", "success", "loading"]);
        setDotPosition(-1);
      }, 5000);

      // t=6s: Node 3 success
      setTimeout(() => {
        setStatuses(["success", "success", "success"]);
        setLogIndex(3);
      }, 6000);

      // t=8s: Loop
      setTimeout(runCycle, 8000);
    }

    runCycle();

    return () => {
      clearTimeout(timer);
    };
  }, [visible]);

  const nodes = [
    {
      label: "Payment Received",
      subtitle: "₹2,499 • rzp_order_xyz",
      color: "#2B84EA",
      letter: "R",
    },
    {
      label: "Update Database",
      subtitle: "Users → Mark as Paid",
      logo: "/logos/notion.svg",
    },
    {
      label: "Send Message",
      subtitle: "Hi {{name}}, payment confirmed!",
      logo: "/logos/whatsapp.svg",
    },
  ];

  function StatusDot({ status }: { status: NodeStatus }) {
    if (status === "idle")
      return <span className="h-2.5 w-2.5 rounded-full bg-[#D4D4D4]" />;
    if (status === "loading")
      return (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8470A] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E8470A]" />
        </span>
      );
    return <Check className="h-3.5 w-3.5 text-green-500" />;
  }

  return (
    <section id="demo" ref={ref} className="relative px-6 py-24 md:py-32">
      <div
        className={`mx-auto max-w-5xl transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <div className="flex flex-col items-stretch gap-6 lg:flex-row">
          {/* Canvas */}
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-xl">
            {/* Dot grid background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #D4D4D4 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-4">
              {nodes.map((node, i) => (
                <div
                  key={node.label}
                  className="flex w-full flex-col items-center"
                >
                  {/* Node card */}
                  <div
                    className={`flex w-full max-w-xs items-center gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all duration-500 ${
                      statuses[i] === "success"
                        ? "border-green-200 shadow-green-50"
                        : statuses[i] === "loading"
                          ? "border-[#E8470A]/30 shadow-[#E8470A]/5"
                          : "border-[#E5E5E5]"
                    }`}
                  >
                    {/* Node icon */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#F5F5F5]">
                      {node.logo ? (
                        <Image
                          src={node.logo}
                          alt={node.label}
                          width={24}
                          height={24}
                        />
                      ) : (
                        <span
                          className="text-sm font-bold text-white rounded-md"
                          style={{
                            backgroundColor: node.color,
                            padding: "2px 6px",
                          }}
                        >
                          {node.letter}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-dm-sans)] text-sm font-medium text-[#0A0A0A]">
                          {node.label}
                        </span>
                        <StatusDot status={statuses[i]} />
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs text-[#525252]">
                        {node.subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Connection line between nodes */}
                  {i < nodes.length - 1 && (
                    <div className="relative flex h-10 w-px items-center justify-center">
                      <div className="h-full w-px bg-[#E5E5E5]" />
                      {dotPosition === i && (
                        <span className="absolute h-2 w-2 animate-bounce rounded-full bg-[#E8470A] shadow-lg shadow-[#E8470A]/50" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Execution log */}
          <div className="w-full rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-6 lg:w-72">
            <h4 className="mb-4 font-[family-name:var(--font-dm-sans)] text-xs font-medium uppercase tracking-wider text-[#525252]">
              Execution Log
            </h4>
            <div className="flex flex-col gap-3">
              {LOG_LINES.map((line, i) => (
                <div
                  key={line.text}
                  className={`flex items-start gap-2 transition-all duration-500 ${
                    i <= logIndex
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                  <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs leading-relaxed text-[#525252]">
                    {line.text}
                  </span>
                </div>
              ))}
              <div
                className={`flex items-start gap-2 transition-all duration-500 ${
                  logIndex >= 3
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#E8470A]" />
                <span className="font-[family-name:var(--font-jetbrains-mono)] text-xs leading-relaxed text-[#E8470A]">
                  Workflow completed in 1.2s
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: NODES SHOWCASE
   ═══════════════════════════════════════════════════════════════════════════════ */
function NodesShowcase() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="nodes" ref={ref} className="bg-[#F5F5F5] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div
          className={`text-center transition-all duration-700 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#0A0A0A] md:text-5xl">
            Every tool your business uses
          </h2>
          <p className="mt-4 font-[family-name:var(--font-dm-sans)] text-lg text-[#525252]">
            50+ integrations built and growing
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {NODES_GRID.map((node, i) => (
            <div
              key={node.name}
              className={`group relative flex flex-col items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[#E8470A]/40 hover:shadow-lg ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
            >
              {node.featured && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-[#FFF3EE] px-2 py-0.5 font-[family-name:var(--font-dm-sans)] text-[10px] font-medium text-[#E8470A]">
                  Featured
                </span>
              )}
              <div className="flex h-12 w-12 items-center justify-center">
                <NodeIcon node={node} />
              </div>
              <span className="font-[family-name:var(--font-dm-sans)] text-sm font-medium text-[#0A0A0A]">
                {node.name}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center font-[family-name:var(--font-dm-sans)] text-sm text-[#525252]">
          + 44 more integrations coming soon
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: HOW IT WORKS
   ═══════════════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="how-it-works" ref={ref} className="px-6 py-24 md:py-32">
      <div id="features" className="mx-auto max-w-5xl">
        <div
          className={`text-center transition-all duration-700 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#0A0A0A] md:text-5xl">
            How it works
          </h2>
        </div>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          {/* Connecting line */}
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-[#E5E5E5] md:block" />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`relative flex flex-col items-center text-center transition-all duration-700 ${
                  visible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
                  <Icon className="h-6 w-6 text-[#E8470A]" />
                </div>
                <span className="mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF3EE] font-[family-name:var(--font-dm-sans)] text-xs font-medium text-[#E8470A]">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-[family-name:var(--font-syne)] text-lg font-bold text-[#0A0A0A]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#525252]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: INDIA-FIRST FEATURES
   ═══════════════════════════════════════════════════════════════════════════════ */
function IndiaFeatures() {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="bg-[#0A0A0A] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div
          className={`text-center transition-all duration-700 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-white md:text-5xl">
            Built for Indian businesses
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {INDIA_FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`rounded-2xl border border-white/10 bg-white/5 p-8 transition-all duration-700 hover:border-[#E8470A]/30 hover:bg-white/[0.08] ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="text-2xl">{feature.emoji}</span>
              <h3 className="mt-4 font-[family-name:var(--font-syne)] text-lg font-bold text-white">
                {feature.title}
              </h3>
              <p className="mt-2 font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-white/60">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: USE CASES
   ═══════════════════════════════════════════════════════════════════════════════ */
function UseCases() {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div
          className={`text-center transition-all duration-700 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#0A0A0A] md:text-5xl">
            What teams build with Nodebase
          </h2>
        </div>

        <div className="mt-16 flex gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {USE_CASES.map((uc, i) => (
            <div
              key={uc.title}
              className={`min-w-[300px] flex-1 rounded-2xl border border-[#E5E5E5] bg-white p-8 transition-all duration-700 ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <span className="inline-block rounded-lg bg-[#FFF3EE] px-3 py-1 font-[family-name:var(--font-dm-sans)] text-xs font-medium text-[#E8470A]">
                {uc.category}
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-syne)] text-lg font-bold text-[#0A0A0A]">
                {uc.title}
              </h3>
              <div className="mt-3 flex items-center gap-2">
                {uc.flow.map((f, fi) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="rounded bg-[#F5F5F5] px-2 py-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] text-[#525252]">
                      {f}
                    </span>
                    {fi < uc.flow.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-[#D4D4D4]" />
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#525252]">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: PRICING
   ═══════════════════════════════════════════════════════════════════════════════ */
function Pricing() {
  const { ref, visible } = useScrollReveal();

  return (
    <section
      id="pricing"
      ref={ref}
      className="bg-[#F5F5F5] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div
          className={`text-center transition-all duration-700 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-[#0A0A0A] md:text-5xl">
            Simple, transparent pricing
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PRICING_TIERS.map((tier, i) => (
            <div
              key={tier.title}
              className={`relative rounded-2xl border bg-white p-8 transition-all duration-700 ${
                tier.featured
                  ? "border-[#E8470A] shadow-xl shadow-[#E8470A]/10"
                  : "border-[#E5E5E5]"
              } ${
                visible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#E8470A] px-3 py-1 font-[family-name:var(--font-dm-sans)] text-xs font-medium text-white">
                  Most Popular
                </span>
              )}
              <h3 className="font-[family-name:var(--font-syne)] text-lg font-bold text-[#0A0A0A]">
                {tier.title}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-[family-name:var(--font-syne)] text-4xl font-extrabold text-[#0A0A0A]">
                  {tier.price}
                </span>
                <span className="font-[family-name:var(--font-dm-sans)] text-sm text-[#525252]">
                  {tier.sub}
                </span>
              </div>
              <ul className="mt-6 flex flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#E8470A]" />
                    <span className="font-[family-name:var(--font-dm-sans)] text-sm text-[#525252]">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.title === "Enterprise" ? "#" : "/sign-up"}
                className={`mt-8 block rounded-xl py-3 text-center font-[family-name:var(--font-dm-sans)] text-sm font-medium transition-colors ${
                  tier.featured
                    ? "bg-[#E8470A] text-white hover:bg-[#c93d09]"
                    : "border border-[#E5E5E5] text-[#0A0A0A] hover:border-[#E8470A]/30 hover:text-[#E8470A]"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: CTA BANNER
   ═══════════════════════════════════════════════════════════════════════════════ */
function CtaBanner() {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="px-6 py-24 md:py-32">
      <div
        className={`mx-auto max-w-5xl rounded-3xl bg-[#E8470A] px-8 py-16 text-center md:px-16 transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <h2 className="font-[family-name:var(--font-syne)] text-3xl font-bold text-white md:text-5xl">
          Start automating today
        </h2>
        <p className="mt-4 font-[family-name:var(--font-dm-sans)] text-lg text-white/80">
          Free forever. No credit card required.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 font-[family-name:var(--font-dm-sans)] text-base font-medium text-[#E8470A] transition-all hover:bg-white/90 hover:shadow-lg"
        >
          Build your first workflow →
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION: FOOTER
   ═══════════════════════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-[#E5E5E5] px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-1.5">
              <span className="font-[family-name:var(--font-syne)] text-lg font-bold text-[#0A0A0A]">
                Nodebase
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E8470A]" />
            </Link>
            <p className="mt-3 font-[family-name:var(--font-dm-sans)] text-sm text-[#525252]">
              Automate anything.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-[family-name:var(--font-dm-sans)] text-sm font-medium text-[#0A0A0A]">
                {col.title}
              </h4>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-[family-name:var(--font-dm-sans)] text-sm text-[#525252] transition-colors hover:text-[#0A0A0A]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 border-t border-[#E5E5E5] pt-8 text-center">
          <p className="font-[family-name:var(--font-dm-sans)] text-sm text-[#525252]">
            © 2026 Nodebase. Made in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════════════════════ */
export function MarketingLandingPage() {
  return (
    <main className="min-h-screen bg-white font-[family-name:var(--font-dm-sans)] [scroll-behavior:smooth]">
      <Navbar />
      <Hero />
      <WorkflowDemo />
      <NodesShowcase />
      <HowItWorks />
      <IndiaFeatures />
      <UseCases />
      <Pricing />
      <CtaBanner />
      <Footer />
    </main>
  );
}
