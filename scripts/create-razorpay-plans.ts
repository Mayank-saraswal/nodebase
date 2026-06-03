import Razorpay from "razorpay"
import { PRICE_CATALOG } from "../src/config/pricing"

async function createPlans() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env first")
    process.exit(1)
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  const plans: Array<{
    period: "monthly"
    interval: number
    item: { name: string; amount: number; currency: string; description: string }
  }> = [
    {
      period: "monthly",
      interval: 1,
      item: {
        name: "Nodebase Starter",
        amount: PRICE_CATALOG.STARTER.monthly * 100, // in paise
        currency: "INR",
        description: "10,000 workflow runs/month, 50 workflows",
      },
    },
    {
      period: "monthly",
      interval: 1,
      item: {
        name: "Nodebase Pro",
        amount: PRICE_CATALOG.PRO.monthly * 100, // in paise
        currency: "INR",
        description: "100,000 workflow runs/month, unlimited workflows",
      },
    },
    {
      period: "monthly",
      interval: 1,
      item: {
        name: "Nodebase Team",
        amount: PRICE_CATALOG.TEAM.monthly * 100, // in paise
        currency: "INR",
        description: "500,000 workflow runs/month, team features",
      },
    },
  ]

  for (const plan of plans) {
    const tierName = plan.item.name.split(" ")[1].toUpperCase()
    const envVarName = `RAZORPAY_PLAN_${tierName}_ID`
    
    if (process.env[envVarName]) {
      console.log(`Plan '${plan.item.name}' already exists via env ${envVarName} → ID: ${process.env[envVarName]}`)
      console.log("")
      continue
    }

    const created = (await razorpay.plans.create(plan)) as unknown as { id: string }
    console.log(`Created plan: ${plan.item.name} → ID: ${created.id}`)
    console.log(`Add to .env: ${envVarName}=${created.id}`)
    console.log("")
  }

  console.log("Done! Copy the plan IDs above into your .env file.")
}

createPlans().catch((err) => {
  console.error(err)
  process.exit(1)
})
