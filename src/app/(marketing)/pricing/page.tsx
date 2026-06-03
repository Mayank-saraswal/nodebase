import type { Metadata } from "next"
import { PricingPage } from "./pricing-page"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Nodebase workflow automation. " +
    "Start free, upgrade when you grow. Plans for indie hackers, startups, and teams.",
  openGraph: {
    title: "Pricing — Nodebase",
    description:
      "Simple, transparent pricing. Start free, upgrade when you grow.",
  },
}

export default function Page() {
  return <PricingPage />
}
