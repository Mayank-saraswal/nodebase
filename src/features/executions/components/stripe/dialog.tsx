"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

const STRIPE_OPS = [
  "BALANCE_GET",
  "CHARGE_CREATE",
  "CHARGE_GET",
  "CHARGE_LIST",
  "CHARGE_UPDATE",
  "COUPON_CREATE",
  "COUPON_LIST",
  "CUSTOMER_CREATE",
  "CUSTOMER_GET",
  "CUSTOMER_LIST",
  "CUSTOMER_DELETE",
  "PAYMENT_INTENT_CREATE",
  "PAYMENT_INTENT_GET",
  "PAYMENT_INTENT_LIST",
  "PAYMENT_INTENT_UPDATE",
  "PRICE_CREATE",
  "PRICE_LIST",
  "SOURCE_CREATE",
  "SOURCE_GET",
  "TOKEN_CREATE",
] as const

const formSchema = z.object({
  variableName: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/),
  operation: z.string().min(1),
  amount: z.string().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  customerId: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  chargeId: z.string().optional(),
  paymentIntentId: z.string().optional(),
  source: z.string().optional(),
  sourceId: z.string().optional(),
  paymentMethod: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().optional(),
  unitAmount: z.string().optional(),
  percentOff: z.string().optional(),
  amountOff: z.string().optional(),
  duration: z.string().optional(),
  metadataJson: z.string().optional(),
  paramsJson: z.string().optional(),
  confirm: z.boolean().optional(),
  cardNumber: z.string().optional(),
  expMonth: z.string().optional(),
  expYear: z.string().optional(),
  cvc: z.string().optional(),
})

export type StripeFormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: StripeFormValues) => void
  defaultValues?: Partial<StripeFormValues>
}

export const StripeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<StripeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "stripe",
      operation: defaultValues.operation || "CUSTOMER_LIST",
      amount: defaultValues.amount || "",
      currency: defaultValues.currency || "usd",
      description: defaultValues.description || "",
      customerId: defaultValues.customerId || "",
      email: defaultValues.email || "",
      name: defaultValues.name || "",
      chargeId: defaultValues.chargeId || "",
      paymentIntentId: defaultValues.paymentIntentId || "",
      source: defaultValues.source || "",
      sourceId: defaultValues.sourceId || "",
      paymentMethod: defaultValues.paymentMethod || "",
      productId: defaultValues.productId || "",
      productName: defaultValues.productName || "",
      unitAmount: defaultValues.unitAmount || "",
      percentOff: defaultValues.percentOff || "",
      amountOff: defaultValues.amountOff || "",
      duration: defaultValues.duration || "once",
      metadataJson: defaultValues.metadataJson || "",
      paramsJson: defaultValues.paramsJson || "",
      confirm: defaultValues.confirm ?? false,
      cardNumber: defaultValues.cardNumber || "",
      expMonth: defaultValues.expMonth || "",
      expYear: defaultValues.expYear || "",
      cvc: defaultValues.cvc || "",
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      variableName: defaultValues.variableName || "stripe",
      operation: defaultValues.operation || "CUSTOMER_LIST",
      amount: defaultValues.amount || "",
      currency: defaultValues.currency || "usd",
      description: defaultValues.description || "",
      customerId: defaultValues.customerId || "",
      email: defaultValues.email || "",
      name: defaultValues.name || "",
      chargeId: defaultValues.chargeId || "",
      paymentIntentId: defaultValues.paymentIntentId || "",
      source: defaultValues.source || "",
      sourceId: defaultValues.sourceId || "",
      paymentMethod: defaultValues.paymentMethod || "",
      productId: defaultValues.productId || "",
      productName: defaultValues.productName || "",
      unitAmount: defaultValues.unitAmount || "",
      percentOff: defaultValues.percentOff || "",
      amountOff: defaultValues.amountOff || "",
      duration: defaultValues.duration || "once",
      metadataJson: defaultValues.metadataJson || "",
      paramsJson: defaultValues.paramsJson || "",
      confirm: defaultValues.confirm ?? false,
      cardNumber: defaultValues.cardNumber || "",
      expMonth: defaultValues.expMonth || "",
      expYear: defaultValues.expYear || "",
      cvc: defaultValues.cvc || "",
    })
  }, [open, defaultValues, form])

  const op = form.watch("operation") || "CUSTOMER_LIST"
  const varName = form.watch("variableName") || "stripe"

  const needsAmount = [
    "CHARGE_CREATE",
    "PAYMENT_INTENT_CREATE",
    "PAYMENT_INTENT_UPDATE",
  ].includes(op)
  const needsCustomerId = [
    "CUSTOMER_GET",
    "CUSTOMER_DELETE",
    "CHARGE_LIST",
  ].includes(op)
  const needsChargeId = ["CHARGE_GET", "CHARGE_UPDATE"].includes(op)
  const needsPiId = [
    "PAYMENT_INTENT_GET",
    "PAYMENT_INTENT_UPDATE",
  ].includes(op)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stripe Configuration</DialogTitle>
          <DialogDescription>
            Full @corsair-dev/stripe surface (charges, customers, payment
            intents, prices, coupons, sources, tokens, balance). Amounts in
            cents.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => {
              onSubmit(v)
              onOpenChange(false)
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>{`Output: {{${varName}}}`}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      <SelectGroup>
                        <SelectLabel>Balance / Charges</SelectLabel>
                        {STRIPE_OPS.filter(
                          (o) =>
                            o.startsWith("BALANCE") || o.startsWith("CHARGE"),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Customers / Coupons</SelectLabel>
                        {STRIPE_OPS.filter(
                          (o) =>
                            o.startsWith("CUSTOMER") || o.startsWith("COUPON"),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Payment intents / Prices</SelectLabel>
                        {STRIPE_OPS.filter(
                          (o) =>
                            o.startsWith("PAYMENT") || o.startsWith("PRICE"),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Sources / Tokens</SelectLabel>
                        {STRIPE_OPS.filter(
                          (o) =>
                            o.startsWith("SOURCE") || o.startsWith("TOKEN"),
                        ).map((o) => (
                          <SelectItem key={o} value={o}>
                            {o.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            {needsAmount && (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (cents)</FormLabel>
                    <FormControl>
                      <Input placeholder="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="usd" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(needsCustomerId || op === "CUSTOMER_CREATE") && (
              <>
                {needsCustomerId && (
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {op === "CUSTOMER_CREATE" && (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </>
            )}
            {needsChargeId && (
              <FormField
                control={form.control}
                name="chargeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {needsPiId && (
              <FormField
                control={form.control}
                name="paymentIntentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Intent ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {op === "CHARGE_CREATE" && (
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source / token</FormLabel>
                    <FormControl>
                      <Input placeholder="tok_visa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {op === "PAYMENT_INTENT_CREATE" && (
              <FormField
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Confirm immediately</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paramsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Extra params JSON (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="font-mono text-xs min-h-16"
                      placeholder="{}"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
