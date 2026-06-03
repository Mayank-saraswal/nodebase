import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#111111",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div style={{
          background: "#F97316",
          borderRadius: "16px",
          padding: "16px 32px",
          marginBottom: "32px",
        }}>
          <span style={{
            color: "white",
            fontSize: "32px",
            fontWeight: "bold",
          }}>
            Nodebase
          </span>
        </div>
        <h1 style={{
          color: "white",
          fontSize: "64px",
          fontWeight: "bold",
          textAlign: "center",
          margin: "0 0 24px",
          lineHeight: 1.1,
        }}>
          Workflow Automation
          <br />
          Built for India
        </h1>
        <p style={{
          color: "#F97316",
          fontSize: "28px",
          textAlign: "center",
          margin: 0,
        }}>
          Razorpay · Cashfree · MSG91 · Shiprocket · 100+ integrations
        </p>
      </div>
    ),
    size
  )
}
