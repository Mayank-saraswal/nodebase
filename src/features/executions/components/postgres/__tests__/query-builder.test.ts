import { describe, expect, it } from "vitest"
import {
  buildSelect, buildInsert, buildInsertMany,
  buildUpdate, buildDelete, buildUpsert
} from "../query-builder"
import type { WhereCondition } from "../types"

describe("Postgres Query Builder", () => {
  describe("buildSelect", () => {
    it("SELECT * with no where — generates SELECT * FROM \"public\".\"orders\"", () => {
      const { sql, params } = buildSelect({
        schema: "public",
        table: "orders",
        columns: [],
        where: [],
        orderBy: [],
        limit: 0,
        offset: 0,
        joins: []
      })
      
      expect(sql.trim()).toBe(`SELECT * FROM "public"."orders"`)
      expect(params).toEqual([])
    })

    it("SELECT specific columns — quotes column names", () => {
      const { sql } = buildSelect({
        schema: "public",
        table: "orders",
        columns: ["id", "amount", "user.name"],
        where: [],
        orderBy: [],
        limit: 0,
        offset: 0,
        joins: []
      })
      
      expect(sql).toContain(`SELECT "id", "amount", "user"."name"`)
    })

    it("WHERE equals — generates $1 param", () => {
      const where: WhereCondition[] = [
        { id: "1", column: "amount", operator: "=", value: "100", value2: "", logic: "AND" }
      ]
      const { sql, params } = buildSelect({
        schema: "public",
        table: "orders",
        columns: [],
        where,
        orderBy: [],
        limit: 0,
        offset: 0,
        joins: []
      })
      
      expect(sql).toContain(`WHERE "amount" = $1`)
      expect(params).toEqual(["100"])
    })

    it("WHERE IN — generates ANY($1) syntax", () => {
      const where: WhereCondition[] = [
        { id: "1", column: "status", operator: "IN", value: "[\"paid\",\"failed\"]", value2: "", logic: "AND" }
      ]
      const { sql, params } = buildSelect({
        schema: "public", table: "orders", columns: [], where, orderBy: [], limit: 0, offset: 0, joins: []
      })
      expect(sql).toContain(`WHERE "status" = ANY($1::text[])`)
      expect(params).toEqual([["paid", "failed"]])
    })

    it("WHERE IS NULL — no param generated", () => {
      const where: WhereCondition[] = [
        { id: "1", column: "deletedAt", operator: "IS NULL", value: "", value2: "", logic: "AND" }
      ]
      const { sql, params } = buildSelect({
        schema: "public", table: "orders", columns: [], where, orderBy: [], limit: 0, offset: 0, joins: []
      })
      expect(sql).toContain(`WHERE "deletedAt" IS NULL`)
      expect(params).toEqual([])
    })

    it("WHERE BETWEEN — generates $1 and $2 params", () => {
      const where: WhereCondition[] = [
        { id: "1", column: "amount", operator: "BETWEEN", value: "10", value2: "100", logic: "AND" }
      ]
      const { sql, params } = buildSelect({
        schema: "public", table: "orders", columns: [], where, orderBy: [], limit: 0, offset: 0, joins: []
      })
      expect(sql).toContain(`WHERE "amount" >= $1 AND "amount" <= $2`)
      expect(params).toEqual(["10", "100"])
    })

    it("WHERE multiple conditions — AND/OR correctly placed", () => {
      const where: WhereCondition[] = [
        { id: "1", column: "amount", operator: ">", value: "100", value2: "", logic: "AND" },
        { id: "2", column: "status", operator: "=", value: "paid", value2: "", logic: "OR" },
        { id: "3", column: "user_id", operator: "=", value: "u123", value2: "", logic: "AND" }
      ]
      const { sql, params } = buildSelect({
        schema: "public", table: "orders", columns: [], where, orderBy: [], limit: 0, offset: 0, joins: []
      })
      expect(sql).toContain(`WHERE "amount" > $1 OR "status" = $2 AND "user_id" = $3`)
      expect(params).toEqual(["100", "paid", "u123"])
    })

    it("ORDER BY ASC/DESC", () => {
      const { sql } = buildSelect({
        schema: "public", table: "o", columns: [], where: [], 
        orderBy: [{ column: "created_at", direction: "DESC", nullsLast: true }], limit: 0, offset: 0, joins: []
      })
      expect(sql).toContain(`ORDER BY "created_at" DESC NULLS LAST`)
    })

    it("LIMIT and OFFSET applied", () => {
      const { sql, params } = buildSelect({
        schema: "public", table: "o", columns: [], where: [], orderBy: [], limit: 10, offset: 20, joins: []
      })
      expect(sql).toContain(`LIMIT $1 OFFSET $2`)
      expect(params).toEqual([10, 20])
    })

    it("JOIN — INNER/LEFT/RIGHT/FULL generated", () => {
      const { sql } = buildSelect({
        schema: "public", table: "orders", columns: [], where: [], orderBy: [], limit: 0, offset: 0, 
        joins: [{ type: "LEFT", table: "users", alias: "u", on: '"orders"."user_id" = "u"."id"' }]
      })
      expect(sql).toContain(`LEFT JOIN "users" AS "u" ON "orders"."user_id" = "u"."id"`)
    })
  })

  describe("buildInsert", () => {
    it("Single row, RETURNING *", () => {
      const { sql, params } = buildInsert({ schema: "public", table: "users", data: { name: "John", age: 30 }, returnData: true })
      expect(sql).toBe(`INSERT INTO "public"."users" ("name", "age") VALUES ($1, $2) RETURNING *`)
      expect(params).toEqual(["John", 30])
    })
    
    it("Single row, no returning", () => {
      const { sql } = buildInsert({ schema: "public", table: "users", data: { name: "John" }, returnData: false })
      expect(sql).not.toContain("RETURNING")
    })
  })

  describe("buildInsertMany", () => {
    it("3 rows generates 6 params... and explicit columns override inference", () => {
      const rows = [
        { c1: "v1", c2: "v2" },
        { c1: "v3", c2: "v4" },
        { c1: "v5", c2: "v6" }
      ]
      const { sql, params } = buildInsertMany({ schema: "public", table: "t", rows, columns: ["c1","c2"], returnData: false })
      expect(sql).toContain(`INSERT INTO "public"."t" ("c1","c2") VALUES ($1,$2),($3,$4),($5,$6)`)
      expect(params).toEqual(["v1", "v2", "v3", "v4", "v5", "v6"])
    })
  })

  describe("buildUpdate", () => {
    it("SET clause generated correctly and WHERE clause generated after SET", () => {
      const { sql, params } = buildUpdate({ 
        schema: "public", table: "t", 
        data: { status: "paid" }, 
        where: [{ id:"1", column: "id", operator: "=", value: "123", value2: "", logic: "AND" }],
        returnData: true,
        allowFullTableUpdate: false
      })
      expect(sql).toContain(`UPDATE "public"."t" SET "status"=$1 WHERE "id" = $2 RETURNING *`)
      expect(params).toEqual(["paid", "123"])
    })
  })

  describe("buildDelete", () => {
    it("WHERE required — throws if empty conditions", () => {
      expect(() => {
        buildDelete({ schema: "public", table: "t", where: [], returnData: false })
      }).toThrow("DELETE without WHERE")
    })
    it("RETURNING * appended", () => {
      const { sql } = buildDelete({ schema: "p", table: "t", where: [{ id:"1", column:"id", operator:"=", value:"1", value2:"", logic:"AND"}], returnData: true })
      expect(sql).toContain(`RETURNING *`)
    })
  })

  describe("buildUpsert", () => {
    it("ON CONFLICT clause with conflict columns", () => {
      const { sql, params } = buildUpsert({ schema: "public", table: "t", data: { id: 1, val: "A" }, conflictColumns: ["id"], updateColumns: [], returnData: true })
      expect(sql).toContain(`ON CONFLICT ("id") DO UPDATE SET "val" = EXCLUDED."val"`)
    })
    
    it("Explicit updateColumns list respected", () => {
      const { sql } = buildUpsert({ 
        schema: "public", table: "t", data: { id: 1, val: "A", other: "B" }, 
        conflictColumns: ["id"], updateColumns: ["other"], returnData: true 
      })
      expect(sql).toContain(`DO UPDATE SET "other" = EXCLUDED."other"`)
      expect(sql).not.toContain(`"val" = EXCLUDED."val"`)
    })
    
    it("SECURITY: Table name with injection attempt -> double quoted", () => {
      // "orders; DROP TABLE users" -> ""orders; DROP TABLE users""
      const { sql } = buildSelect({ schema: "public", table: 'orders"; DROP TABLE users;--', columns: [], where: [], limit:0, offset:0, joins: [], orderBy: [] })
      expect(sql).toEqual(`SELECT * FROM "public"."orders""; DROP TABLE users;--"`)
    })
  })
})
