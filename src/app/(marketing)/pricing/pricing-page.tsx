"use client"

import { PLAN_LIMITS } from "@/lib/plan-limits"
import { CheckIcon, XIcon, ZapIcon, SparklesIcon, ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { PRICE_CATALOG } from "@/config/pricing"

/* ─── plan data ──────────────────────────────────────────── */

type Interval = "monthly" | "yearly"

interface PlanCard {
  key: string
  name: string
  tagline: string
  monthlyPrice: number | null // null = custom
  yearlyPrice: number | null
  cta: string
  ctaHref: string
  featured: boolean
  features: string[]
  notIncluded?: string[]
}

const plans: PlanCard[] = [
  {
    key: "FREE",
    name: "Free",
    tagline: "For side projects & experiments",
    monthlyPrice: PRICE_CATALOG.FREE.monthly,
    yearlyPrice: PRICE_CATALOG.FREE.yearly,
    cta: "Get Started Free",
    ctaHref: "/signup",
    featured: false,
    features: [
      `${PLAN_LIMITS.FREE.runs.toLocaleString()} workflow runs / mo`,
      `${PLAN_LIMITS.FREE.workflows} workflows`,
      "All core nodes",
      "Community support",
    ],
    notIncluded: ["Priority support", "Custom nodes", "Team collaboration"],
  },
  {
    key: "STARTER",
    name: "Starter",
    tagline: "For indie hackers & small biz",
    monthlyPrice: PRICE_CATALOG.STARTER.monthly,
    yearlyPrice: PRICE_CATALOG.STARTER.yearly,
    cta: "Start 14-day Trial",
    ctaHref: "/signup?plan=starter",
    featured: false,
    features: [
      `${PLAN_LIMITS.STARTER.runs.toLocaleString()} workflow runs / mo`,
      `${PLAN_LIMITS.STARTER.workflows} workflows`,
      "All core + premium nodes",
      "Email support",
      "Webhook triggers",
      "Execution history — 30 days",
    ],
    notIncluded: ["Custom nodes", "Team collaboration"],
  },
  {
    key: "PRO",
    name: "Pro",
    tagline: "For growing startups & D2C brands",
    monthlyPrice: PRICE_CATALOG.PRO.monthly,
    yearlyPrice: PRICE_CATALOG.PRO.yearly,
    cta: "Start 14-day Trial",
    ctaHref: "/signup?plan=pro",
    featured: true,
    features: [
      `${PLAN_LIMITS.PRO.runs.toLocaleString()} workflow runs / mo`,
      "Unlimited workflows",
      "All nodes incl. AI nodes",
      "Priority email & chat support",
      "Webhook triggers",
      "Execution history — 90 days",
      "Custom branding",
    ],
    notIncluded: ["Team collaboration"],
  },
  {
    key: "TEAM",
    name: "Team",
    tagline: "For teams & agencies",
    monthlyPrice: PRICE_CATALOG.TEAM.monthly,
    yearlyPrice: PRICE_CATALOG.TEAM.yearly,
    cta: "Contact Sales",
    ctaHref: "/signup?plan=team",
    featured: false,
    features: [
      `${PLAN_LIMITS.TEAM.runs.toLocaleString()} workflow runs / mo`,
      "Unlimited workflows",
      "Everything in Pro",
      "Team collaboration",
      "Dedicated account manager",
      "Execution history — 1 year",
      "SLA guarantee",
      "Custom integrations",
    ],
  },
]

const faqs = [
  {
    q: "Can I change plans later?",
    a: "Yes — upgrade, downgrade, or cancel anytime. Changes take effect at the next billing cycle.",
  },
  {
    q: "What happens when I hit my run limit?",
    a: "Workflows will pause until the next month or until you upgrade. No data is lost.",
  },
  {
    q: "Do you support Indian payment methods?",
    a: "Absolutely. We use Razorpay — pay with UPI, cards, net-banking, or wallets.",
  },
  {
    q: "Is there a free trial?",
    a: "Paid plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "Can I get a refund?",
    a: "We offer a 30-day money-back guarantee on all paid plans. No questions asked.",
  },
]

/* ─── component ──────────────────────────────────────────── */

export function PricingPage() {
  const [interval, setInterval] = useState<Interval>("monthly")

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-orange-500/30">
      {/* ── Nav ─── */}
      <nav className="border-b border-white/5 backdrop-blur-md bg-[#0a0a0a]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
           
            <span className="text-lg font-bold tracking-tight">Nodebase</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─── */}
      <section className="pt-24 pb-8 text-center px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-6">
          <SparklesIcon className="size-3.5" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
          Plans that scale{" "}
          <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
            with you
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
          Start free—no credit card needed.
          <br className="hidden sm:inline" /> Upgrade when your automation needs grow.
        </p>
      </section>

      {/* ── Interval toggle ─── */}
      <div className="flex justify-center mb-14">
        <div className="relative inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
          <button
            id="toggle-monthly"
            onClick={() => setInterval("monthly")}
            className={`relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
              interval === "monthly" ? "text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            Monthly
          </button>
          <button
            id="toggle-yearly"
            onClick={() => setInterval("yearly")}
            className={`relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
              interval === "yearly" ? "text-white" : "text-white/50 hover:text-white/70"
            }`}
          >
            Yearly
            <span className="ml-1.5 text-[10px] font-semibold text-orange-400">-20%</span>
          </button>
          {/* sliding pill */}
          <span
            className="absolute top-1 bottom-1 rounded-full bg-white/10 transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
            style={{
              left: interval === "monthly" ? "4px" : "50%",
              width: "calc(50% - 4px)",
            }}
          />
        </div>
      </div>

      {/* ── Cards ─── */}
      <section className="max-w-7xl mx-auto px-6 pb-28">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const price = interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice
            const isFree = price === 0

            return (
              <div
                key={plan.key}
                id={`plan-${plan.key.toLowerCase()}`}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? "border-orange-500/40 bg-gradient-to-b from-orange-500/[0.07] to-transparent shadow-[0_0_40px_-12px_rgba(249,115,22,0.25)]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/15"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-orange-500/30">
                    Most Popular
                  </div>
                )}

                {/* header */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-white/40">{plan.tagline}</p>
                </div>

                {/* price */}
                <div className="mb-6">
                  {isFree ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">₹0</span>
                      <span className="text-sm text-white/40">/ forever</span>
                    </div>
                  ) : price != null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-white/40">/ mo</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-extrabold tracking-tight">Custom</div>
                  )}
                  {!isFree && interval === "yearly" && price != null && (
                    <p className="text-xs text-orange-400/70 mt-1">
                      Billed ₹{(price * 12).toLocaleString("en-IN")} / year
                    </p>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  id={`cta-${plan.key.toLowerCase()}`}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 mb-6 ${
                    plan.featured
                      ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-110"
                      : "bg-white/8 text-white hover:bg-white/12 border border-white/10"
                  }`}
                >
                  {plan.cta}
                  <ArrowRightIcon className="size-3.5" />
                </Link>

                {/* features */}
                <ul className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <CheckIcon className="size-4 shrink-0 text-orange-500 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded?.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/25">
                      <XIcon className="size-4 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FAQ ─── */}
      <section className="border-t border-white/5 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">
            Frequently asked questions
          </h2>
          <div className="space-y-0 divide-y divide-white/8">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group py-5 [&[open]>summary]:text-orange-400"
              >
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-white/80 hover:text-white transition-colors list-none">
                  {faq.q}
                  <span className="text-white/30 group-open:rotate-45 transition-transform text-lg leading-none">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-white/50 leading-relaxed pr-8">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─── */}
      <section className="pb-28 px-6 text-center">
        <div className="max-w-lg mx-auto rounded-2xl border border-orange-500/20 bg-gradient-to-b from-orange-500/[0.06] to-transparent p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to automate?</h2>
          <p className="text-sm text-white/50 mb-6">
            Join thousands of Indian businesses running on Nodebase.
          </p>
          <Link
            href="/signup"
            id="cta-bottom"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-110 transition-all"
          >
            Get Started Free
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-white/30">
        © {new Date().getFullYear()} Nodebase. All rights reserved.
      </footer>
    </div>
  )
}
