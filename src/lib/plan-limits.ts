// Plan IDs — create these once via the setup script, then add to .env
export const RAZORPAY_PLAN_IDS = {
  STARTER: process.env.RAZORPAY_PLAN_STARTER_ID || "",
  PRO: process.env.RAZORPAY_PLAN_PRO_ID || "",
  TEAM: process.env.RAZORPAY_PLAN_TEAM_ID || "",
} as const

export const PLAN_LIMITS = {
  FREE: { runs: 100, workflows: 5, name: "Free" },
  STARTER: { runs: 10000, workflows: 50, name: "Starter" },
  PRO: { runs: 100000, workflows: 999999, name: "Pro" },
  TEAM: { runs: 500000, workflows: 999999, name: "Team" },
} as const

export type PlanKey = keyof typeof PLAN_LIMITS
