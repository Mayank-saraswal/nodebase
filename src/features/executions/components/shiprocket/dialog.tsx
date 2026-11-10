"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export interface ShiprocketFormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  orderId?: string
  orderDate?: string
  channelId?: string
  billingName?: string
  billingAddress?: string
  billingAddress2?: string
  billingCity?: string
  billingState?: string
  billingCountry?: string
  billingPincode?: string
  billingEmail?: string
  billingPhone?: string
  billingAlternatePhone?: string
  shippingIsBilling?: boolean
  shippingName?: string
  shippingAddress?: string
  shippingAddress2?: string
  shippingCity?: string
  shippingState?: string
  shippingCountry?: string
  shippingPincode?: string
  shippingEmail?: string
  shippingPhone?: string
  orderItems?: string
  paymentMethod?: string
  subTotal?: string
  codAmount?: string
  length?: string
  breadth?: string
  height?: string
  weight?: string
  shiprocketOrderId?: string
  shipmentId?: string
  awbCode?: string
  courierId?: string
  courierName?: string
  pickupLocation?: string
  pickupPostcode?: string
  deliveryPostcode?: string
  cod?: string
  returnOrderId?: string
  returnReason?: string
  returnPickupLocation?: string
  productName?: string
  productSku?: string
  productMrp?: string
  productSellingPrice?: string
  productWeight?: string
  productCategory?: string
  productHsn?: string
  filterStatus?: string
  pageNo?: number
  perPage?: number
  warehouseName?: string
  warehouseEmail?: string
  warehousePhone?: string
  warehouseAddress?: string
  warehouseCity?: string
  warehouseState?: string
  warehousePincode?: string
  warehouseCountry?: string
  cancelReason?: string
  continueOnFail?: boolean
}

interface ShiprocketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ShiprocketFormValues) => void
  defaultValues?: Partial<ShiprocketFormValues>
  nodeId?: string
  workflowId?: string
}

type ShiprocketOp =
  | "CREATE_ORDER" | "GET_ORDER" | "CANCEL_ORDER" | "UPDATE_ORDER"
  | "GET_ORDER_TRACKING" | "CLONE_ORDER" | "GENERATE_AWB" | "GET_ORDERS_LIST"
  | "TRACK_SHIPMENT" | "ASSIGN_COURIER" | "GENERATE_LABEL" | "GENERATE_MANIFEST"
  | "REQUEST_PICKUP"
  | "GET_COURIER_LIST" | "GET_RATE" | "CHECK_SERVICEABILITY"
  | "CREATE_RETURN" | "GET_RETURN_REASONS" | "TRACK_RETURN"
  | "CREATE_PRODUCT" | "GET_PRODUCTS"
  | "GET_PICKUP_LOCATIONS" | "CREATE_PICKUP_LOCATION"

const ORDER_OPS: ShiprocketOp[] = ["CREATE_ORDER", "GET_ORDER", "CANCEL_ORDER", "UPDATE_ORDER", "GET_ORDER_TRACKING", "CLONE_ORDER", "GENERATE_AWB", "GET_ORDERS_LIST"]
const SHIPMENT_OPS: ShiprocketOp[] = ["TRACK_SHIPMENT", "ASSIGN_COURIER", "GENERATE_LABEL", "GENERATE_MANIFEST", "REQUEST_PICKUP"]
const COURIER_OPS: ShiprocketOp[] = ["GET_COURIER_LIST", "GET_RATE", "CHECK_SERVICEABILITY"]
const RETURN_OPS: ShiprocketOp[] = ["CREATE_RETURN", "GET_RETURN_REASONS", "TRACK_RETURN"]
const PRODUCT_OPS: ShiprocketOp[] = ["CREATE_PRODUCT", "GET_PRODUCTS"]
const WAREHOUSE_OPS: ShiprocketOp[] = ["GET_PICKUP_LOCATIONS", "CREATE_PICKUP_LOCATION"]

const needsOrderFields = (op: string) => ["CREATE_ORDER", "UPDATE_ORDER"].includes(op)
const needsShiprocketOrderId = (op: string) => ["GET_ORDER", "CANCEL_ORDER", "UPDATE_ORDER", "GET_ORDER_TRACKING", "CLONE_ORDER", "CREATE_RETURN"].includes(op)
const needsShipmentId = (op: string) => ["GENERATE_AWB", "ASSIGN_COURIER", "GENERATE_LABEL", "GENERATE_MANIFEST", "REQUEST_PICKUP"].includes(op)
const needsAwbCode = (op: string) => op === "TRACK_SHIPMENT"
const needsCourierId = (op: string) => ["ASSIGN_COURIER", "GENERATE_AWB"].includes(op)
const needsPincodes = (op: string) => COURIER_OPS.includes(op as ShiprocketOp)
const needsProductFields = (op: string) => op === "CREATE_PRODUCT"
const needsWarehouseFields = (op: string) => op === "CREATE_PICKUP_LOCATION"
const needsReturnOrderId = (op: string) => op === "TRACK_RETURN"

const OUTPUT_HINTS: Record<string, string[]> = {
  CREATE_ORDER: ["order_id", "shipment_id", "status", "channel_order_id"],
  GET_ORDER: ["order_id", "status", "shipments", "billing_address"],
  CANCEL_ORDER: ["order_id", "status"],
  UPDATE_ORDER: ["order_id", "status"],
  GET_ORDER_TRACKING: ["tracking_data", "shipment_status"],
  CLONE_ORDER: ["order_id", "shipment_id", "status"],
  GENERATE_AWB: ["awb_code", "courier_name", "shipment_id"],
  GET_ORDERS_LIST: ["data", "meta"],
  TRACK_SHIPMENT: ["tracking_data", "current_status", "shipment_track"],
  ASSIGN_COURIER: ["awb_code", "courier_name"],
  GENERATE_LABEL: ["label_url", "shipment_id"],
  GENERATE_MANIFEST: ["manifest_url", "shipment_id"],
  REQUEST_PICKUP: ["pickup_scheduled_date", "status"],
  GET_COURIER_LIST: ["available_courier_companies", "recommended_courier_company_id"],
  GET_RATE: ["available_courier_companies", "recommended_courier_company_id"],
  CHECK_SERVICEABILITY: ["serviceable", "available_courier_companies"],
  CREATE_RETURN: ["order_id", "shipment_id", "status"],
  GET_RETURN_REASONS: ["reasons"],
  TRACK_RETURN: ["tracking_data", "shipment_status"],
  CREATE_PRODUCT: ["product_id", "name", "sku"],
  GET_PRODUCTS: ["data", "meta"],
  GET_PICKUP_LOCATIONS: ["shipping_address"],
  CREATE_PICKUP_LOCATION: ["address", "pickup_location"],
}

export const ShiprocketDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: ShiprocketDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<ShiprocketOp>((defaultValues.operation as ShiprocketOp) || "CREATE_ORDER")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "shiprocket")

  // Order fields
  const [orderId, setOrderId] = useState(defaultValues.orderId || "")
  const [orderDate, setOrderDate] = useState(defaultValues.orderDate || "")
  const [channelId, setChannelId] = useState(defaultValues.channelId || "")
  const [billingName, setBillingName] = useState(defaultValues.billingName || "")
  const [billingAddress, setBillingAddress] = useState(defaultValues.billingAddress || "")
  const [billingAddress2, setBillingAddress2] = useState(defaultValues.billingAddress2 || "")
  const [billingCity, setBillingCity] = useState(defaultValues.billingCity || "")
  const [billingState, setBillingState] = useState(defaultValues.billingState || "")
  const [billingCountry, setBillingCountry] = useState(defaultValues.billingCountry || "India")
  const [billingPincode, setBillingPincode] = useState(defaultValues.billingPincode || "")
  const [billingEmail, setBillingEmail] = useState(defaultValues.billingEmail || "")
  const [billingPhone, setBillingPhone] = useState(defaultValues.billingPhone || "")
  const [billingAlternatePhone, setBillingAlternatePhone] = useState(defaultValues.billingAlternatePhone || "")
  const [shippingIsBilling, setShippingIsBilling] = useState(defaultValues.shippingIsBilling ?? true)
  const [shippingName, setShippingName] = useState(defaultValues.shippingName || "")
  const [shippingAddress, setShippingAddress] = useState(defaultValues.shippingAddress || "")
  const [shippingAddress2, setShippingAddress2] = useState(defaultValues.shippingAddress2 || "")
  const [shippingCity, setShippingCity] = useState(defaultValues.shippingCity || "")
  const [shippingState, setShippingState] = useState(defaultValues.shippingState || "")
  const [shippingCountry, setShippingCountry] = useState(defaultValues.shippingCountry || "India")
  const [shippingPincode, setShippingPincode] = useState(defaultValues.shippingPincode || "")
  const [shippingEmail, setShippingEmail] = useState(defaultValues.shippingEmail || "")
  const [shippingPhone, setShippingPhone] = useState(defaultValues.shippingPhone || "")
  const [orderItems, setOrderItems] = useState(defaultValues.orderItems || "[]")
  const [paymentMethod, setPaymentMethod] = useState(defaultValues.paymentMethod || "prepaid")
  const [subTotal, setSubTotal] = useState(defaultValues.subTotal || "")
  const [codAmount, setCodAmount] = useState(defaultValues.codAmount || "0")
  const [length, setLength] = useState(defaultValues.length || "")
  const [breadth, setBreadth] = useState(defaultValues.breadth || "")
  const [height, setHeight] = useState(defaultValues.height || "")
  const [weight, setWeight] = useState(defaultValues.weight || "")

  // IDs
  const [shiprocketOrderId, setShiprocketOrderId] = useState(defaultValues.shiprocketOrderId || "")
  const [shipmentId, setShipmentId] = useState(defaultValues.shipmentId || "")
  const [awbCode, setAwbCode] = useState(defaultValues.awbCode || "")
  const [courierId, setCourierId] = useState(defaultValues.courierId || "")
  const [courierName, setCourierName] = useState(defaultValues.courierName || "")
  const [pickupLocation, setPickupLocation] = useState(defaultValues.pickupLocation || "")

  // Pincodes
  const [pickupPostcode, setPickupPostcode] = useState(defaultValues.pickupPostcode || "")
  const [deliveryPostcode, setDeliveryPostcode] = useState(defaultValues.deliveryPostcode || "")
  const [cod, setCod] = useState(defaultValues.cod || "0")

  // Return
  const [returnOrderId, setReturnOrderId] = useState(defaultValues.returnOrderId || "")
  const [returnReason, setReturnReason] = useState(defaultValues.returnReason || "")
  const [returnPickupLocation, setReturnPickupLocation] = useState(defaultValues.returnPickupLocation || "")

  // Product
  const [productName, setProductName] = useState(defaultValues.productName || "")
  const [productSku, setProductSku] = useState(defaultValues.productSku || "")
  const [productMrp, setProductMrp] = useState(defaultValues.productMrp || "")
  const [productSellingPrice, setProductSellingPrice] = useState(defaultValues.productSellingPrice || "")
  const [productWeight, setProductWeight] = useState(defaultValues.productWeight || "")
  const [productCategory, setProductCategory] = useState(defaultValues.productCategory || "")
  const [productHsn, setProductHsn] = useState(defaultValues.productHsn || "")

  // List
  const [filterStatus, setFilterStatus] = useState(defaultValues.filterStatus || "")
  const [pageNo, setPageNo] = useState(defaultValues.pageNo ?? 1)
  const [perPage, setPerPage] = useState(defaultValues.perPage ?? 10)

  // Warehouse
  const [warehouseName, setWarehouseName] = useState(defaultValues.warehouseName || "")
  const [warehouseEmail, setWarehouseEmail] = useState(defaultValues.warehouseEmail || "")
  const [warehousePhone, setWarehousePhone] = useState(defaultValues.warehousePhone || "")
  const [warehouseAddress, setWarehouseAddress] = useState(defaultValues.warehouseAddress || "")
  const [warehouseCity, setWarehouseCity] = useState(defaultValues.warehouseCity || "")
  const [warehouseState, setWarehouseState] = useState(defaultValues.warehouseState || "")
  const [warehousePincode, setWarehousePincode] = useState(defaultValues.warehousePincode || "")
  const [warehouseCountry, setWarehouseCountry] = useState(defaultValues.warehouseCountry || "India")

  const [cancelReason, setCancelReason] = useState(defaultValues.cancelReason || "")
  const [continueOnFail, setContinueOnFail] = useState(defaultValues.continueOnFail ?? false)
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.SHIPROCKET)

  const config = undefined as any;
const isLoading = false;

useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as ShiprocketOp)
      setVariableName(config.variableName || "shiprocket")
      setOrderId(config.orderId)
      setOrderDate(config.orderDate)
      setChannelId(config.channelId)
      setBillingName(config.billingName)
      setBillingAddress(config.billingAddress)
      setBillingAddress2(config.billingAddress2)
      setBillingCity(config.billingCity)
      setBillingState(config.billingState)
      setBillingCountry(config.billingCountry)
      setBillingPincode(config.billingPincode)
      setBillingEmail(config.billingEmail)
      setBillingPhone(config.billingPhone)
      setBillingAlternatePhone(config.billingAlternatePhone)
      setShippingIsBilling(config.shippingIsBilling)
      setShippingName(config.shippingName)
      setShippingAddress(config.shippingAddress)
      setShippingAddress2(config.shippingAddress2)
      setShippingCity(config.shippingCity)
      setShippingState(config.shippingState)
      setShippingCountry(config.shippingCountry)
      setShippingPincode(config.shippingPincode)
      setShippingEmail(config.shippingEmail)
      setShippingPhone(config.shippingPhone)
      setOrderItems(config.orderItems)
      setPaymentMethod(config.paymentMethod)
      setSubTotal(config.subTotal)
      setCodAmount(config.codAmount)
      setLength(config.length)
      setBreadth(config.breadth)
      setHeight(config.height)
      setWeight(config.weight)
      setShiprocketOrderId(config.shiprocketOrderId)
      setShipmentId(config.shipmentId)
      setAwbCode(config.awbCode)
      setCourierId(config.courierId)
      setCourierName(config.courierName)
      setPickupLocation(config.pickupLocation)
      setPickupPostcode(config.pickupPostcode)
      setDeliveryPostcode(config.deliveryPostcode)
      setCod(config.cod)
      setReturnOrderId(config.returnOrderId)
      setReturnReason(config.returnReason)
      setReturnPickupLocation(config.returnPickupLocation)
      setProductName(config.productName)
      setProductSku(config.productSku)
      setProductMrp(config.productMrp)
      setProductSellingPrice(config.productSellingPrice)
      setProductWeight(config.productWeight)
      setProductCategory(config.productCategory)
      setProductHsn(config.productHsn)
      setFilterStatus(config.filterStatus)
      setPageNo(config.pageNo)
      setPerPage(config.perPage)
      setWarehouseName(config.warehouseName)
      setWarehouseEmail(config.warehouseEmail)
      setWarehousePhone(config.warehousePhone)
      setWarehouseAddress(config.warehouseAddress)
      setWarehouseCity(config.warehouseCity)
      setWarehouseState(config.warehouseState)
      setWarehousePincode(config.warehousePincode)
      setWarehouseCountry(config.warehouseCountry)
      setCancelReason(config.cancelReason)
      setContinueOnFail(config.continueOnFail)
    }
  }, [config])

  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as ShiprocketOp) || "CREATE_ORDER")
      setVariableName(defaultValues.variableName || "shiprocket")
      setContinueOnFail(defaultValues.continueOnFail ?? false)
    }
  }, [open, config, defaultValues])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = () => {
    if (!nodeId || !workflowId) return
    const values: ShiprocketFormValues = {
      credentialId: credentialId || undefined,
      operation,
      variableName,
      orderId, orderDate, channelId,
      billingName, billingAddress, billingAddress2, billingCity, billingState, billingCountry, billingPincode, billingEmail, billingPhone, billingAlternatePhone,
      shippingIsBilling, shippingName, shippingAddress, shippingAddress2, shippingCity, shippingState, shippingCountry, shippingPincode, shippingEmail, shippingPhone,
      orderItems, paymentMethod, subTotal, codAmount,
      length, breadth, height, weight,
      shiprocketOrderId, shipmentId, awbCode, courierId, courierName,
      pickupLocation, pickupPostcode, deliveryPostcode, cod,
      returnOrderId, returnReason, returnPickupLocation,
      productName, productSku, productMrp, productSellingPrice, productWeight, productCategory, productHsn,
      filterStatus, pageNo, perPage,
      warehouseName, warehouseEmail, warehousePhone, warehouseAddress, warehouseCity, warehouseState, warehousePincode, warehouseCountry,
      cancelReason, continueOnFail,
    }
    upsertMutation.mutate({
      nodeId,
      workflowId,
      ...values,
      operation: operation as ShiprocketOp,
    })
    onSubmit(values)
  }

  const v = variableName || "shiprocket"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shiprocket Configuration</DialogTitle>
          <DialogDescription>
            Indian shipping automation — orders, shipments, tracking, returns
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="animate-spin size-6 text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* ── Credential ───────────────────────────────── */}
            <div className="space-y-2">
              <Label>Shiprocket Credential</Label>
              {isLoadingCredentials ? (
                <div className="text-sm text-muted-foreground">Loading credentials…</div>
              ) : credentials && credentials.length > 0 ? (
                <Select value={credentialId} onValueChange={setCredentialId}>
                  <SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger>
                  <SelectContent>
                    {credentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Shiprocket credentials.{" "}
                  <Link href="/credentials" className="underline">Add one</Link>
                </p>
              )}
            </div>

            <Separator />

            {/* ── Operation (grouped) ──────────────────────── */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={(val) => setOperation(val as ShiprocketOp)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Orders</SelectLabel>
                    <SelectItem value="CREATE_ORDER">Create Order</SelectItem>
                    <SelectItem value="GET_ORDER">Get Order</SelectItem>
                    <SelectItem value="CANCEL_ORDER">Cancel Order</SelectItem>
                    <SelectItem value="UPDATE_ORDER">Update Order</SelectItem>
                    <SelectItem value="GET_ORDER_TRACKING">Track Order</SelectItem>
                    <SelectItem value="CLONE_ORDER">Clone Order</SelectItem>
                    <SelectItem value="GENERATE_AWB">Generate AWB</SelectItem>
                    <SelectItem value="GET_ORDERS_LIST">List Orders</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Shipments</SelectLabel>
                    <SelectItem value="TRACK_SHIPMENT">Track Shipment (AWB)</SelectItem>
                    <SelectItem value="ASSIGN_COURIER">Assign Courier</SelectItem>
                    <SelectItem value="GENERATE_LABEL">Generate Label</SelectItem>
                    <SelectItem value="GENERATE_MANIFEST">Generate Manifest</SelectItem>
                    <SelectItem value="REQUEST_PICKUP">Request Pickup</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Couriers</SelectLabel>
                    <SelectItem value="GET_COURIER_LIST">Get Courier List</SelectItem>
                    <SelectItem value="GET_RATE">Get Shipping Rates</SelectItem>
                    <SelectItem value="CHECK_SERVICEABILITY">Check Serviceability</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Returns</SelectLabel>
                    <SelectItem value="CREATE_RETURN">Create Return</SelectItem>
                    <SelectItem value="GET_RETURN_REASONS">Get Return Reasons</SelectItem>
                    <SelectItem value="TRACK_RETURN">Track Return</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Products</SelectLabel>
                    <SelectItem value="CREATE_PRODUCT">Create Product</SelectItem>
                    <SelectItem value="GET_PRODUCTS">List Products</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Warehouse</SelectLabel>
                    <SelectItem value="GET_PICKUP_LOCATIONS">Get Pickup Locations</SelectItem>
                    <SelectItem value="CREATE_PICKUP_LOCATION">Create Pickup Location</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* ── Variable Name ────────────────────────────── */}
            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input value={variableName} onChange={(e) => setVariableName(e.target.value)} placeholder="shiprocket" />
              <p className="text-xs text-muted-foreground">Access result as <code>{`{{${v}.order_id}}`}</code></p>
            </div>

            <Separator />

            {/* ── Shiprocket Order ID ──────────────────────── */}
            {needsShiprocketOrderId(operation) && (
              <div className="space-y-2">
                <Label>Shiprocket Order ID</Label>
                <Input value={shiprocketOrderId} onChange={(e) => setShiprocketOrderId(e.target.value)} placeholder="e.g. 12345678" />
              </div>
            )}

            {/* ── Cancel Reason ─────────────────────────────── */}
            {operation === "CANCEL_ORDER" && (
              <div className="space-y-2">
                <Label>Cancel Reason</Label>
                <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancellation" />
              </div>
            )}

            {/* ── Shipment ID ──────────────────────────────── */}
            {needsShipmentId(operation) && (
              <div className="space-y-2">
                <Label>Shipment ID</Label>
                <Input value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} placeholder="e.g. 87654321" />
              </div>
            )}

            {/* ── Courier ID ───────────────────────────────── */}
            {needsCourierId(operation) && (
              <div className="space-y-2">
                <Label>Courier ID</Label>
                <Input value={courierId} onChange={(e) => setCourierId(e.target.value)} placeholder="e.g. 51 (optional for AWB)" />
              </div>
            )}

            {/* ── AWB Code ─────────────────────────────────── */}
            {needsAwbCode(operation) && (
              <div className="space-y-2">
                <Label>AWB Code</Label>
                <Input value={awbCode} onChange={(e) => setAwbCode(e.target.value)} placeholder="e.g. 1234567890" />
              </div>
            )}

            {/* ── Return Order ID ──────────────────────────── */}
            {needsReturnOrderId(operation) && (
              <div className="space-y-2">
                <Label>Return Order ID</Label>
                <Input value={returnOrderId} onChange={(e) => setReturnOrderId(e.target.value)} placeholder="e.g. 11223344" />
              </div>
            )}

            {/* ── Pincodes (Courier/Rate/Serviceability) ──── */}
            {needsPincodes(operation) && (
              <>
                <div className="space-y-2">
                  <Label>Pickup Postcode</Label>
                  <Input value={pickupPostcode} onChange={(e) => setPickupPostcode(e.target.value)} placeholder="e.g. 110001" />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Postcode</Label>
                  <Input value={deliveryPostcode} onChange={(e) => setDeliveryPostcode(e.target.value)} placeholder="e.g. 400001" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 0.5" />
                </div>
                <div className="space-y-2">
                  <Label>COD (0 or 1)</Label>
                  <Input value={cod} onChange={(e) => setCod(e.target.value)} placeholder="0" />
                </div>
              </>
            )}

            {/* ── Order Creation Fields ────────────────────── */}
            {needsOrderFields(operation) && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Order Details</p>

                <div className="space-y-2">
                  <Label>External Order ID</Label>
                  <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Your system order ID" />
                </div>
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input value={orderDate} onChange={(e) => setOrderDate(e.target.value)} placeholder="YYYY-MM-DD HH:MM" />
                </div>
                <div className="space-y-2">
                  <Label>Pickup Location</Label>
                  <Input value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="Warehouse name" />
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Billing Address</p>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={billingState} onChange={(e) => setBillingState(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input value={billingPincode} onChange={(e) => setBillingPincode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
                </div>

                {/* Shipping = Billing toggle */}
                <div className="flex items-center gap-2">
                  <Switch checked={shippingIsBilling} onCheckedChange={setShippingIsBilling} />
                  <Label>Shipping same as billing</Label>
                </div>

                {!shippingIsBilling && (
                  <>
                    <Separator />
                    <p className="text-sm font-medium text-muted-foreground">Shipping Address</p>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={shippingName} onChange={(e) => setShippingName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={shippingState} onChange={(e) => setShippingState(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Pincode</Label>
                        <Input value={shippingPincode} onChange={(e) => setShippingPincode(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Items & Payment</p>
                <div className="space-y-2">
                  <Label>Order Items (JSON array)</Label>
                  <Textarea value={orderItems} onChange={(e) => setOrderItems(e.target.value)} rows={3} placeholder='[{"name":"T-Shirt","sku":"SKU001","units":2,"selling_price":"499"}]' />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prepaid">Prepaid</SelectItem>
                        <SelectItem value="cod">COD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Total</Label>
                    <Input value={subTotal} onChange={(e) => setSubTotal(e.target.value)} placeholder="499" />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Package Dimensions</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Length (cm)</Label>
                    <Input value={length} onChange={(e) => setLength(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Breadth (cm)</Label>
                    <Input value={breadth} onChange={(e) => setBreadth(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input value={height} onChange={(e) => setHeight(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.5" />
                  </div>
                </div>
              </>
            )}

            {/* ── Product fields ────────────────────────────── */}
            {needsProductFields(operation) && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Product Details</p>
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input value={productSku} onChange={(e) => setProductSku(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>MRP</Label>
                    <Input value={productMrp} onChange={(e) => setProductMrp(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Selling Price</Label>
                    <Input value={productSellingPrice} onChange={(e) => setProductSellingPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input value={productWeight} onChange={(e) => setProductWeight(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={productCategory} onChange={(e) => setProductCategory(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>HSN Code</Label>
                    <Input value={productHsn} onChange={(e) => setProductHsn(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* ── Warehouse fields ──────────────────────────── */}
            {needsWarehouseFields(operation) && (
              <>
                <Separator />
                <p className="text-sm font-medium text-muted-foreground">Warehouse / Pickup Location</p>
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={warehouseEmail} onChange={(e) => setWarehouseEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={warehousePhone} onChange={(e) => setWarehousePhone(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={warehouseCity} onChange={(e) => setWarehouseCity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={warehouseState} onChange={(e) => setWarehouseState(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input value={warehousePincode} onChange={(e) => setWarehousePincode(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={warehouseCountry} onChange={(e) => setWarehouseCountry(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* ── List pagination ───────────────────────────── */}
            {["GET_ORDERS_LIST", "GET_PRODUCTS"].includes(operation) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Page</Label>
                    <Input type="number" value={pageNo} onChange={(e) => setPageNo(Number(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Per Page</Label>
                    <Input type="number" value={perPage} onChange={(e) => setPerPage(Number(e.target.value) || 10)} />
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* ── Continue on Fail ──────────────────────────── */}
            <div className="flex items-center gap-2">
              <Switch checked={continueOnFail} onCheckedChange={setContinueOnFail} />
              <Label>Continue on Fail</Label>
            </div>

            {/* ── Output hints ──────────────────────────────── */}
            {OUTPUT_HINTS[operation] && (
              <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Output fields:</p>
                {OUTPUT_HINTS[operation].map((key) => (
                  <code key={key} className="block">{`{{${v}.${key}}}`}</code>
                ))}
              </div>
            )}

            {/* ── Save button ──────────────────────────────── */}
            <Button onClick={handleSave} disabled={upsertMutation.isPending} className="w-full">
              {upsertMutation.isPending ? (
                <Loader2Icon className="animate-spin size-4 mr-2" />
              ) : saved ? (
                <CheckIcon className="size-4 mr-2" />
              ) : null}
              {saved ? "Saved!" : "Save Configuration"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
