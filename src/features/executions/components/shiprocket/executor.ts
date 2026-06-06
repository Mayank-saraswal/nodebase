import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { shiprocketChannel } from "@/inngest/channels/shiprocket"
import { ShiprocketOperation } from "@/features/executions/enums"

interface ShiprocketCredential {
  email: string
  password: string
}

type ShiprocketData = {
  nodeId?: string
}

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external"

async function getShiprocketToken(email: string, password: string): Promise<string> {
  const response = await fetch(
    `${SHIPROCKET_BASE}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!response.ok) {
    throw new NonRetriableError(
      "Shiprocket authentication failed. Check your email and password."
    )
  }

  const data = await response.json() as Record<string, unknown>
  if (!data.token) {
    throw new NonRetriableError(
      "Shiprocket login did not return a token."
    )
  }
  return data.token as string
}

async function shiprocketRequest(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${SHIPROCKET_BASE}${path}`
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (response.status === 429) {
    throw new NonRetriableError("Shiprocket rate limit exceeded. Try again later.")
  }

  if (response.status === 401) {
    throw new NonRetriableError(
      "Shiprocket auth token invalid or expired. Check your credential."
    )
  }

  if (response.status >= 500) {
    throw new NonRetriableError(`Shiprocket server error: HTTP ${response.status}`)
  }

  const text = await response.text()
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { message: text }
  }
}

export const shiprocketExecutor: NodeExecutor<ShiprocketData> = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    shiprocketChannel().status({
      nodeId,
      status: "loading",
    })
  )

  // Step 1: Load config
  const config = data as any;

if (!config) {
    await publish(
      shiprocketChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Shiprocket node not configured. Open settings to configure."
    )
  }

  // Step 2: Load and decrypt credential
  const credential = await step.run(
    `shiprocket-${nodeId}-load-credential`,
    async () => {
      if (!config.credentialId) return null
      return prisma.credential.findUnique({
        where: {
          id: config.credentialId,
          userId,
        },
      })
    }
  )

  if (!credential) {
    await publish(
      shiprocketChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Shiprocket credential not found. Please add a Shiprocket credential first."
    )
  }

  const raw = decrypt(credential.value)
  let creds: ShiprocketCredential
  try {
    creds = JSON.parse(raw)
  } catch {
    await publish(
      shiprocketChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Failed to decrypt Shiprocket credential. Re-save it."
    )
  }

  const variableName = config.variableName || "shiprocket"

  // Step 3: Execute operation
  const result = await step.run(
    `shiprocket-${nodeId}-execute`,
    async (): Promise<Record<string, unknown>> => {
      // Get fresh JWT token
      const token = await getShiprocketToken(creds.email, creds.password)

      // Helper to resolve templates in config fields
      const r = (value: string) => resolveTemplate(value, context)

      try {
        switch (config.operation) {
          // ── GROUP 1: Orders ────────────────────────────────────────

          case ShiprocketOperation.CREATE_ORDER: {
            let items: unknown[]
            try {
              items = JSON.parse(r(config.orderItems)) as unknown[]
            } catch {
              items = []
            }

            const orderBody: Record<string, unknown> = {
              order_id: r(config.orderId),
              order_date: r(config.orderDate),
              pickup_location: r(config.pickupLocation),
              channel_id: r(config.channelId) || undefined,
              billing_customer_name: r(config.billingName),
              billing_last_name: "",
              billing_address: r(config.billingAddress),
              billing_address_2: r(config.billingAddress2),
              billing_city: r(config.billingCity),
              billing_pincode: r(config.billingPincode),
              billing_state: r(config.billingState),
              billing_country: r(config.billingCountry),
              billing_email: r(config.billingEmail),
              billing_phone: r(config.billingPhone),
              billing_alternate_phone: r(config.billingAlternatePhone),
              shipping_is_billing: config.shippingIsBilling ? 1 : 0,
              order_items: items,
              payment_method: r(config.paymentMethod),
              sub_total: Number(r(config.subTotal)) || 0,
              length: Number(r(config.length)) || 0,
              breadth: Number(r(config.breadth)) || 0,
              height: Number(r(config.height)) || 0,
              weight: Number(r(config.weight)) || 0,
            }

            const resolvedCodAmount = r(config.codAmount)
            if (resolvedCodAmount && resolvedCodAmount !== "0") {
              orderBody.cod_amount = Number(resolvedCodAmount)
            }

            if (!config.shippingIsBilling) {
              orderBody.shipping_customer_name = r(config.shippingName)
              orderBody.shipping_last_name = ""
              orderBody.shipping_address = r(config.shippingAddress)
              orderBody.shipping_address_2 = r(config.shippingAddress2)
              orderBody.shipping_city = r(config.shippingCity)
              orderBody.shipping_pincode = r(config.shippingPincode)
              orderBody.shipping_state = r(config.shippingState)
              orderBody.shipping_country = r(config.shippingCountry)
              orderBody.shipping_email = r(config.shippingEmail)
              orderBody.shipping_phone = r(config.shippingPhone)
            }

            const responseData = await shiprocketRequest("POST", "/orders/create/adhoc", token, orderBody)
            return {
              operation: "CREATE_ORDER",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GET_ORDER: {
            const oid = r(config.shiprocketOrderId)
            if (!oid) throw new NonRetriableError("Shiprocket Order ID is required for GET_ORDER")
            const responseData = await shiprocketRequest("GET", `/orders/show/${oid}`, token)
            return {
              operation: "GET_ORDER",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.CANCEL_ORDER: {
            const ids = r(config.shiprocketOrderId)
            if (!ids) throw new NonRetriableError("Shiprocket Order ID is required for CANCEL_ORDER")
            const cancelBody: Record<string, unknown> = {
              ids: [Number(ids)],
            }
            const resolvedReason = r(config.cancelReason)
            if (resolvedReason) {
              cancelBody.reason = resolvedReason
            }
            const responseData = await shiprocketRequest("POST", "/orders/cancel", token, cancelBody)
            return {
              operation: "CANCEL_ORDER",
              orderId: ids,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.UPDATE_ORDER: {
            const oid = r(config.shiprocketOrderId)
            if (!oid) throw new NonRetriableError("Shiprocket Order ID is required for UPDATE_ORDER")

            let items: unknown[]
            try {
              items = JSON.parse(r(config.orderItems)) as unknown[]
            } catch {
              items = []
            }

            const updateBody: Record<string, unknown> = {
              order_id: oid,
              order_items: items.length > 0 ? items : undefined,
              payment_method: r(config.paymentMethod) || undefined,
              sub_total: r(config.subTotal) ? Number(r(config.subTotal)) : undefined,
              length: r(config.length) ? Number(r(config.length)) : undefined,
              breadth: r(config.breadth) ? Number(r(config.breadth)) : undefined,
              height: r(config.height) ? Number(r(config.height)) : undefined,
              weight: r(config.weight) ? Number(r(config.weight)) : undefined,
            }

            const responseData = await shiprocketRequest("POST", "/orders/update/adhoc", token, updateBody)
            return {
              operation: "UPDATE_ORDER",
              orderId: oid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GET_ORDER_TRACKING: {
            const oid = r(config.shiprocketOrderId)
            if (!oid) throw new NonRetriableError("Shiprocket Order ID is required for GET_ORDER_TRACKING")
            const responseData = await shiprocketRequest("GET", `/courier/track?order_id=${oid}`, token)
            return {
              operation: "GET_ORDER_TRACKING",
              orderId: oid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.CLONE_ORDER: {
            const oid = r(config.shiprocketOrderId)
            if (!oid) throw new NonRetriableError("Shiprocket Order ID is required for CLONE_ORDER")
            const responseData = await shiprocketRequest("POST", "/orders/create/clone", token, {
              order_id: oid,
            })
            return {
              operation: "CLONE_ORDER",
              originalOrderId: oid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GENERATE_AWB: {
            const sid = r(config.shipmentId)
            const cid = r(config.courierId)
            if (!sid) throw new NonRetriableError("Shipment ID is required for GENERATE_AWB")
            const body: Record<string, unknown> = { shipment_id: Number(sid) }
            if (cid) body.courier_id = Number(cid)
            const responseData = await shiprocketRequest("POST", "/courier/assign/awb", token, body)
            return {
              operation: "GENERATE_AWB",
              shipmentId: sid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GET_ORDERS_LIST: {
            const params = new URLSearchParams()
            if (r(config.filterStatus)) params.set("status", r(config.filterStatus))
            params.set("page", String(config.pageNo))
            params.set("per_page", String(config.perPage))
            const query = params.toString() ? `?${params.toString()}` : ""
            const responseData = await shiprocketRequest("GET", `/orders${query}`, token)
            return {
              operation: "GET_ORDERS_LIST",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          // ── GROUP 2: Shipments ─────────────────────────────────────

          case ShiprocketOperation.TRACK_SHIPMENT: {
            const awb = r(config.awbCode)
            if (!awb) throw new NonRetriableError("AWB code is required for TRACK_SHIPMENT")
            const responseData = await shiprocketRequest("GET", `/courier/track/awb/${awb}`, token)
            return {
              operation: "TRACK_SHIPMENT",
              awbCode: awb,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.ASSIGN_COURIER: {
            const sid = r(config.shipmentId)
            const cid = r(config.courierId)
            if (!sid) throw new NonRetriableError("Shipment ID is required for ASSIGN_COURIER")
            if (!cid) throw new NonRetriableError("Courier ID is required for ASSIGN_COURIER")
            const responseData = await shiprocketRequest("POST", "/courier/assign/awb", token, {
              shipment_id: Number(sid),
              courier_id: Number(cid),
            })
            return {
              operation: "ASSIGN_COURIER",
              shipmentId: sid,
              courierId: cid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GENERATE_LABEL: {
            const sid = r(config.shipmentId)
            if (!sid) throw new NonRetriableError("Shipment ID is required for GENERATE_LABEL")
            const responseData = await shiprocketRequest("POST", "/courier/generate/label", token, {
              shipment_id: [Number(sid)],
            })
            return {
              operation: "GENERATE_LABEL",
              shipmentId: sid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GENERATE_MANIFEST: {
            const sid = r(config.shipmentId)
            if (!sid) throw new NonRetriableError("Shipment ID is required for GENERATE_MANIFEST")
            const responseData = await shiprocketRequest("POST", "/manifests/generate", token, {
              shipment_id: [Number(sid)],
            })
            return {
              operation: "GENERATE_MANIFEST",
              shipmentId: sid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.REQUEST_PICKUP: {
            const sid = r(config.shipmentId)
            if (!sid) throw new NonRetriableError("Shipment ID is required for REQUEST_PICKUP")
            const responseData = await shiprocketRequest("POST", "/courier/generate/pickup", token, {
              shipment_id: [Number(sid)],
            })
            return {
              operation: "REQUEST_PICKUP",
              shipmentId: sid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          // ── GROUP 3: Couriers ──────────────────────────────────────

          case ShiprocketOperation.GET_COURIER_LIST: {
            const pickup = r(config.pickupPostcode)
            const delivery = r(config.deliveryPostcode)
            const w = r(config.weight)
            if (!pickup || !delivery) {
              throw new NonRetriableError("Pickup and delivery postcodes are required for GET_COURIER_LIST")
            }
            const params = new URLSearchParams({
              pickup_postcode: pickup,
              delivery_postcode: delivery,
              weight: w || "0.5",
              cod: r(config.cod) || "0",
            })
            const responseData = await shiprocketRequest("GET", `/courier/serviceability/?${params.toString()}`, token)
            return {
              operation: "GET_COURIER_LIST",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GET_RATE: {
            const pickup = r(config.pickupPostcode)
            const delivery = r(config.deliveryPostcode)
            const w = r(config.weight)
            if (!pickup || !delivery) {
              throw new NonRetriableError("Pickup and delivery postcodes are required for GET_RATE")
            }
            const params = new URLSearchParams({
              pickup_postcode: pickup,
              delivery_postcode: delivery,
              weight: w || "0.5",
              cod: r(config.cod) || "0",
            })
            const responseData = await shiprocketRequest("GET", `/courier/serviceability/?${params.toString()}`, token)
            return {
              operation: "GET_RATE",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.CHECK_SERVICEABILITY: {
            const pickup = r(config.pickupPostcode)
            const delivery = r(config.deliveryPostcode)
            if (!pickup || !delivery) {
              throw new NonRetriableError("Pickup and delivery postcodes are required for CHECK_SERVICEABILITY")
            }
            const params = new URLSearchParams({
              pickup_postcode: pickup,
              delivery_postcode: delivery,
              weight: r(config.weight) || "0.5",
              cod: r(config.cod) || "0",
            })
            const responseData = await shiprocketRequest("GET", `/courier/serviceability/?${params.toString()}`, token)
            return {
              operation: "CHECK_SERVICEABILITY",
              serviceable: !!(responseData.data && (responseData.data as Record<string, unknown>).available_courier_companies),
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          // ── GROUP 4: Returns ───────────────────────────────────────

          case ShiprocketOperation.CREATE_RETURN: {
            const oid = r(config.shiprocketOrderId)
            if (!oid) throw new NonRetriableError("Shiprocket Order ID is required for CREATE_RETURN")

            let items: unknown[]
            try {
              items = JSON.parse(r(config.orderItems)) as unknown[]
            } catch {
              items = []
            }

            const returnBody: Record<string, unknown> = {
              order_id: Number(oid),
              order_date: r(config.orderDate),
              pickup_customer_name: r(config.billingName),
              pickup_address: r(config.billingAddress),
              pickup_city: r(config.billingCity),
              pickup_state: r(config.billingState),
              pickup_country: r(config.billingCountry),
              pickup_pincode: r(config.billingPincode),
              pickup_email: r(config.billingEmail),
              pickup_phone: r(config.billingPhone),
              order_items: items,
              payment_method: r(config.paymentMethod),
              sub_total: Number(r(config.subTotal)) || 0,
              length: Number(r(config.length)) || 0,
              breadth: Number(r(config.breadth)) || 0,
              height: Number(r(config.height)) || 0,
              weight: Number(r(config.weight)) || 0,
            }

            const resolvedReturnPickup = r(config.returnPickupLocation)
            if (resolvedReturnPickup) {
              returnBody.pickup_location = resolvedReturnPickup
            }

            const responseData = await shiprocketRequest("POST", "/orders/create/return", token, returnBody)
            return {
              operation: "CREATE_RETURN",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GET_RETURN_REASONS: {
            const responseData = await shiprocketRequest("GET", "/orders/return-reasons", token)
            return {
              operation: "GET_RETURN_REASONS",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.TRACK_RETURN: {
            const rid = r(config.returnOrderId)
            if (!rid) throw new NonRetriableError("Return Order ID is required for TRACK_RETURN")
            const responseData = await shiprocketRequest("GET", `/orders/${rid}/track/return`, token)
            return {
              operation: "TRACK_RETURN",
              returnOrderId: rid,
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          // ── GROUP 5: Products ──────────────────────────────────────

          case ShiprocketOperation.CREATE_PRODUCT: {
            const name = r(config.productName)
            const sku = r(config.productSku)
            if (!name) throw new NonRetriableError("Product name is required for CREATE_PRODUCT")
            if (!sku) throw new NonRetriableError("Product SKU is required for CREATE_PRODUCT")
            const responseData = await shiprocketRequest("POST", "/products", token, {
              name,
              sku,
              mrp: Number(r(config.productMrp)) || 0,
              selling_price: Number(r(config.productSellingPrice)) || 0,
              weight: Number(r(config.productWeight)) || 0,
              category: r(config.productCategory) || undefined,
              hsn: r(config.productHsn) || undefined,
            })
            return {
              operation: "CREATE_PRODUCT",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.GET_PRODUCTS: {
            const params = new URLSearchParams()
            params.set("page", String(config.pageNo))
            params.set("per_page", String(config.perPage))
            const responseData = await shiprocketRequest("GET", `/products?${params.toString()}`, token)
            return {
              operation: "GET_PRODUCTS",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          // ── GROUP 6: Warehouse ─────────────────────────────────────

          case ShiprocketOperation.GET_PICKUP_LOCATIONS: {
            const responseData = await shiprocketRequest("GET", "/settings/company/pickup", token)
            return {
              operation: "GET_PICKUP_LOCATIONS",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          case ShiprocketOperation.CREATE_PICKUP_LOCATION: {
            const wName = r(config.warehouseName)
            if (!wName) throw new NonRetriableError("Warehouse name is required for CREATE_PICKUP_LOCATION")
            const responseData = await shiprocketRequest("POST", "/settings/company/addpickup", token, {
              pickup_location: wName,
              name: wName,
              email: r(config.warehouseEmail),
              phone: r(config.warehousePhone),
              address: r(config.warehouseAddress),
              city: r(config.warehouseCity),
              state: r(config.warehouseState),
              pin_code: r(config.warehousePincode),
              country: r(config.warehouseCountry),
            })
            return {
              operation: "CREATE_PICKUP_LOCATION",
              ...responseData,
              timestamp: new Date().toISOString(),
            }
          }

          default:
            throw new NonRetriableError(
              `Unknown Shiprocket operation: ${config.operation}`
            )
        }
      } catch (err) {
        if (err instanceof NonRetriableError) {
          throw err
        }

        if (config.continueOnFail) {
          return {
            operation: config.operation,
            success: false,
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          }
        }
        throw new NonRetriableError(
          `Shiprocket error: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  )

  await publish(
    shiprocketChannel().status({
      nodeId,
      status: "success",
    })
  )

  return {
    ...context,
    [variableName]: result,
  }
}
