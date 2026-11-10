import { describe, expect, it } from "vitest"
import { gmailIntegrationDefinition } from "../integrations/gmail"
import { googleSheetsIntegrationDefinition } from "../integrations/google-sheets"
import { buildAliasMap, resolveOperation } from "../resolve"
import {
  extractOperation,
  normalizeNodeData,
  toNodeDataV1,
} from "../node-data"

describe("registry resolve", () => {
  it("resolves Gmail legacy SEND alias to messages.send", () => {
    const r = resolveOperation(gmailIntegrationDefinition, "SEND")
    expect(r.operation.key).toBe("messages.send")
  })

  it("resolves canonical Gmail key", () => {
    const r = resolveOperation(gmailIntegrationDefinition, "labels.create")
    expect(r.operation.key).toBe("labels.create")
  })

  it("rejects unknown Gmail op", () => {
    expect(() =>
      resolveOperation(gmailIntegrationDefinition, "NOT_REAL"),
    ).toThrow(/unknown operation/)
  })

  it("Sheets APPEND_ROW alias maps to sheets.appendRow", () => {
    const r = resolveOperation(googleSheetsIntegrationDefinition, "APPEND_ROW")
    expect(r.operation.key).toBe("sheets.appendRow")
  })

  it("buildAliasMap includes aliases", () => {
    const map = buildAliasMap(gmailIntegrationDefinition)
    expect(map.get("SEND")).toBe("messages.send")
    expect(map.get("messages.trash")).toBe("messages.trash")
  })
})

describe("node-data helpers", () => {
  it("extractOperation from legacy flat data", () => {
    expect(extractOperation({ operation: "SEND", to: "a@b.com" })).toBe("SEND")
  })

  it("normalizeNodeData merges v1 params", () => {
    const n = normalizeNodeData(
      toNodeDataV1("messages.send", { to: "x@y.com" }, { variableName: "g" }),
    )
    expect(n.operation).toBe("messages.send")
    expect(n.to).toBe("x@y.com")
    expect(n.variableName).toBe("g")
  })

  it("normalizeNodeData passes through legacy flat", () => {
    const n = normalizeNodeData({ operation: "READ_ROWS", spreadsheetId: "ss" })
    expect(n.spreadsheetId).toBe("ss")
  })
})
