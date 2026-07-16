import fs from "fs"

function parseNested(file, marker, endMarker, epClass) {
  const s = fs.readFileSync(file, "utf8")
  const start = s.indexOf(marker)
  const end = s.indexOf(endMarker, start + 1)
  const chunk = s.slice(start, end > 0 ? end : start + 80000)
  const lines = chunk.split("\n")
  const stack = []
  const keys = []
  for (const line of lines) {
    const m = line.match(/readonly (\w+): \{/)
    if (m) {
      stack.push(m[1])
      continue
    }
    const e = line.match(new RegExp(`readonly (\\w+): ${epClass}`))
    if (e) {
      keys.push([...stack, e[1]].join("."))
      continue
    }
    if (line.includes("};") && stack.length) stack.pop()
  }
  return keys
}

function riskFor(key) {
  if (/\.(delete|cancel)/.test(key)) return "destructive"
  if (
    /\.(list|retrieve|get|download|search|count|validate)/.test(key) ||
    key.includes(".list")
  ) {
    return "read"
  }
  return "write"
}

function aliasFor(key) {
  const snake = key
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/\./g, "_")
    .toUpperCase()
  const aliases = [snake]
  if (key === "chat.createCompletion") {
    aliases.push(
      "CHAT",
      "CHAT_COMPLETION",
      "GENERATE_TEXT",
      "CREATE_CHAT_COMPLETION",
    )
  }
  if (key === "embeddings.create") aliases.push("EMBED", "CREATE_EMBEDDING")
  if (key === "images.create") aliases.push("IMAGE", "CREATE_IMAGE")
  if (key === "moderation.create") aliases.push("MODERATE")
  if (key === "models.list") aliases.push("LIST_MODELS")
  if (key === "completions.create") aliases.push("COMPLETION")
  if (key === "audio.createSpeech") aliases.push("TTS", "SPEECH")
  if (key === "audio.createTranscription") aliases.push("TRANSCRIBE")
  return [...new Set(aliases)]
}

const openaiKeys = parseNested(
  "node_modules/@corsair-dev/openai/dist/index.d.ts",
  "declare const openaiEndpointsNested",
  "declare const openaiWebhooksNested",
  "OpenaiEndpoint",
)
const stripeKeys = parseNested(
  "node_modules/@corsair-dev/stripe/dist/index.d.ts",
  "declare const stripeEndpointsNested",
  "declare const stripeWebhooksNested",
  "StripeEndpoint",
)

console.log("openai", openaiKeys.length, "stripe", stripeKeys.length)

const openaiOps = openaiKeys.map((k) => ({
  key: k,
  aliases: aliasFor(k),
  label: k,
  group: k.split(".")[0],
  risk: riskFor(k),
}))

const openaiReg = `/**
 * OpenAI registry — full @corsair-dev/openai surface (${openaiKeys.length} endpoints).
 * Generated from package nested endpoint tree.
 */

import type { IntegrationDefinition, OperationDefinition } from "../types"

export const OPENAI_CORSAIR_ENDPOINTS = ${JSON.stringify(openaiKeys, null, 2)} as const

const OPERATIONS: OperationDefinition[] = ${JSON.stringify(openaiOps, null, 2)} as OperationDefinition[]

export const openaiIntegrationDefinition: IntegrationDefinition = {
  typeKey: "openai",
  kind: "integration",
  corsairPluginId: "openai",
  label: "OpenAI",
  operations: OPERATIONS,
}
`

const stripeAliases = {
  "balance.get": ["BALANCE_GET", "GET_BALANCE"],
  "charges.create": ["CHARGE_CREATE", "CREATE_CHARGE"],
  "charges.get": ["CHARGE_GET", "GET_CHARGE"],
  "charges.list": ["CHARGE_LIST", "LIST_CHARGES"],
  "charges.update": ["CHARGE_UPDATE", "UPDATE_CHARGE"],
  "coupons.create": ["COUPON_CREATE", "CREATE_COUPON"],
  "coupons.list": ["COUPON_LIST", "LIST_COUPONS"],
  "customers.create": ["CUSTOMER_CREATE", "CREATE_CUSTOMER"],
  "customers.delete": ["CUSTOMER_DELETE", "DELETE_CUSTOMER"],
  "customers.get": ["CUSTOMER_GET", "GET_CUSTOMER"],
  "customers.list": ["CUSTOMER_LIST", "LIST_CUSTOMERS"],
  "paymentIntents.create": ["PAYMENT_INTENT_CREATE", "CREATE_PAYMENT_INTENT"],
  "paymentIntents.get": ["PAYMENT_INTENT_GET", "GET_PAYMENT_INTENT"],
  "paymentIntents.list": ["PAYMENT_INTENT_LIST", "LIST_PAYMENT_INTENTS"],
  "paymentIntents.update": ["PAYMENT_INTENT_UPDATE", "UPDATE_PAYMENT_INTENT"],
  "prices.create": ["PRICE_CREATE", "CREATE_PRICE"],
  "prices.list": ["PRICE_LIST", "LIST_PRICES"],
  "sources.create": ["SOURCE_CREATE", "CREATE_SOURCE"],
  "sources.get": ["SOURCE_GET", "GET_SOURCE"],
  "tokens.create": ["TOKEN_CREATE", "CREATE_TOKEN"],
}

const stripeOps = stripeKeys.map((k) => ({
  key: k,
  aliases:
    stripeAliases[k] ||
    [k.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/\./g, "_").toUpperCase()],
  label: k,
  group: k.split(".")[0],
  risk: /delete/.test(k)
    ? "destructive"
    : /\.(get|list)/.test(k)
      ? "read"
      : "write",
}))

const stripeReg = `/**
 * Stripe registry — full @corsair-dev/stripe surface (${stripeKeys.length} endpoints).
 * Generated from package nested endpoint tree.
 */

import type { IntegrationDefinition, OperationDefinition } from "../types"

export const STRIPE_CORSAIR_ENDPOINTS = ${JSON.stringify(stripeKeys, null, 2)} as const

const OPERATIONS: OperationDefinition[] = ${JSON.stringify(stripeOps, null, 2)} as OperationDefinition[]

export const stripeIntegrationDefinition: IntegrationDefinition = {
  typeKey: "stripe",
  kind: "integration",
  corsairPluginId: "stripe",
  label: "Stripe",
  operations: OPERATIONS,
}
`

fs.mkdirSync("src/features/integrations/registry/integrations", {
  recursive: true,
})
fs.writeFileSync(
  "src/features/integrations/registry/integrations/openai.ts",
  openaiReg,
)
fs.writeFileSync(
  "src/features/integrations/registry/integrations/stripe.ts",
  stripeReg,
)
console.log("wrote openai + stripe registries")
