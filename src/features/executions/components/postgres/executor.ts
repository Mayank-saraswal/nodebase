import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { decrypt } from "@/lib/encryption"
import { postgresChannel } from "@/inngest/channels/postgres"
import { executeWithConnection, executeQuery, executeTransaction, testConnection } from "./postgres-engine"
import type { PostgresConnectionConfig } from "./postgres-engine"
import {
  buildSelect, buildCount, buildExists, buildInsert, buildInsertMany,
  buildUpdate, buildDelete, buildUpsert, buildFullTextSearch,
  buildJsonPathQuery, buildJsonSetField, buildCreateTable,
} from "./query-builder"
import type { WhereCondition, OrderByClause, JoinClause, ColumnDefinition, TransactionStatement } from "./types"

export const postgresExecutor: NodeExecutor = async ({
  nodeId, context, step, publish, userId,
}) => {
  // ── Step 1: Load config ───────────────────────────────────────────────────
  const config = await step.run(`postgres-${nodeId}-load`, async () => {
    return prisma.postgresNode.findUnique({
      where: { nodeId },
      include: {
        workflow: { select: { userId: true } },
        credential: true,
      },
    })
  })

  await step.run(`postgres-${nodeId}-validate`, async () => {
    if (!config) throw new NonRetriableError("Postgres node not configured.")
    if (config.workflow.userId !== userId) throw new NonRetriableError("Unauthorized")
    if (!config.credentialId || !config.credential) {
      throw new NonRetriableError(
        "Postgres node: No credential connected. " +
        "Go to node settings and select a PostgreSQL credential."
      )
    }
    return { valid: true }
  })

  if (!config || !config.credential) {
    throw new NonRetriableError("Postgres node not configured.")
  }

  const variableName = config.variableName || "postgres"

  // Decrypt credential OUTSIDE step.run (can't serialize pg.Client)
  let dbConfig: PostgresConnectionConfig
  try {
    dbConfig = JSON.parse(decrypt(config.credential.value)) as PostgresConnectionConfig
  } catch {
    throw new NonRetriableError(
      "Postgres node: Failed to decrypt credential. Please re-save the credential."
    )
  }

  // ── publish OUTSIDE step.run — Rule 11 ───────────────────────────────────
  await publish(postgresChannel(nodeId).status({ nodeId, status: "loading" }))

  let result: Record<string, unknown>

  try {
    result = await step.run(`postgres-${nodeId}-execute`, async () => {
      const r = (field: string): string =>
        resolveTemplate(field, context) as string

      const operation = config.operation || "EXECUTE_QUERY"

      return await executeWithConnection(dbConfig, async (client) => {
        switch (operation) {

          // ── EXECUTE_QUERY ────────────────────────────────────────────────
          case "EXECUTE_QUERY": {
            const sql = r(config.query)
            if (!sql.trim()) {
              throw new NonRetriableError("Postgres/EXECUTE_QUERY: Query cannot be empty.")
            }

            let params: unknown[] = []
            if (config.queryParams && config.queryParams !== "[]") {
              try {
                const rawParams = JSON.parse(config.queryParams) as unknown[]
                params = rawParams.map((p) =>
                  typeof p === "string" ? r(p) : p
                )
              } catch {
                throw new NonRetriableError("Postgres: queryParams must be a valid JSON array.")
              }
            }

            const queryResult = await executeQuery(client, sql, params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              fields: queryResult.fields,
              operation: "EXECUTE_QUERY",
              timestamp: new Date().toISOString(),
            }
          }

          // ── SELECT ───────────────────────────────────────────────────────
          case "SELECT": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/SELECT: Table Name is required.")
            }

            const where = parseWhereConditions(config.whereConditions, r)
            const orderBy: OrderByClause[] = JSON.parse(config.orderBy || "[]")
            const joins: JoinClause[] = JSON.parse(config.joins || "[]")
            const columns: string[] = JSON.parse(config.selectColumns || "[]")

            const built = buildSelect({
              schema: config.schemaName || "public",
              table: config.tableName,
              columns,
              where,
              orderBy,
              limit: config.limitRows || 0,
              offset: config.offsetRows || 0,
              joins,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              hasResults: queryResult.rowCount > 0,
              operation: "SELECT",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── SELECT_ONE ───────────────────────────────────────────────────
          case "SELECT_ONE": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/SELECT_ONE: Table Name is required.")
            }

            const where = parseWhereConditions(config.whereConditions, r)
            const built = buildSelect({
              schema: config.schemaName || "public",
              table: config.tableName,
              columns: JSON.parse(config.selectColumns || "[]"),
              where,
              orderBy: [],
              limit: 1,
              offset: 0,
              joins: [],
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 1)

            if (queryResult.rowCount === 0) {
              throw new NonRetriableError(
                `Postgres/SELECT_ONE: No row found in table '${config.tableName}' ` +
                `matching the given conditions.`
              )
            }

            return {
              row: queryResult.rows[0],
              found: true,
              operation: "SELECT_ONE",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── COUNT ────────────────────────────────────────────────────────
          case "COUNT": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/COUNT: Table Name is required.")
            }

            const where = parseWhereConditions(config.whereConditions, r)
            const built = buildCount({
              schema: config.schemaName || "public",
              table: config.tableName,
              where,
              joins: [],
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 1)
            const count = parseInt(String(queryResult.rows[0]?.count ?? "0"), 10)

            return {
              count,
              operation: "COUNT",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── EXISTS ───────────────────────────────────────────────────────
          case "EXISTS": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/EXISTS: Table Name is required.")
            }

            const where = parseWhereConditions(config.whereConditions, r)
            const built = buildExists({
              schema: config.schemaName || "public",
              table: config.tableName,
              where,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 1)
            const exists = queryResult.rows[0]?.exists === true

            return {
              exists,
              operation: "EXISTS",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── INSERT ───────────────────────────────────────────────────────
          case "INSERT": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/INSERT: Table Name is required.")
            }
            if (!config.insertData) {
              throw new NonRetriableError("Postgres/INSERT: Insert Data is required.")
            }

            const rawData = r(config.insertData)
            let data: Record<string, unknown>
            try {
              data = JSON.parse(rawData) as Record<string, unknown>
            } catch {
              throw new NonRetriableError(
                `Postgres/INSERT: Insert Data must be a JSON object. Got: "${rawData.slice(0, 100)}"`
              )
            }

            // Resolve template expressions inside data values
            const resolvedData: Record<string, unknown> = {}
            for (const [key, val] of Object.entries(data)) {
              resolvedData[key] = typeof val === "string" ? r(val) : val
            }

            const built = buildInsert({
              schema: config.schemaName || "public",
              table: config.tableName,
              data: resolvedData,
              returnData: config.returnData ?? true,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 1)
            return {
              row: queryResult.rows[0] ?? null,
              rowCount: queryResult.rowCount,
              operation: "INSERT",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── INSERT_MANY ──────────────────────────────────────────────────
          case "INSERT_MANY": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/INSERT_MANY: Table Name is required.")
            }
            if (!config.insertManyPath) {
              throw new NonRetriableError(
                "Postgres/INSERT_MANY: Input Path is required. " +
                "Use {{filter.items}} or {{googleSheets.rows}}"
              )
            }

            const resolvedPath = r(config.insertManyPath)
            // Resolve to array from context
            const rows = resolveToArray(context, resolvedPath)
            if (!rows) {
              throw new NonRetriableError(
                `Postgres/INSERT_MANY: Could not resolve array at '${config.insertManyPath}'.`
              )
            }
            if (rows.length === 0) {
              return {
                rowCount: 0,
                rows: [],
                operation: "INSERT_MANY",
                table: config.tableName,
                skipped: true,
                reason: "Empty input array",
                timestamp: new Date().toISOString(),
              }
            }

            const columns: string[] = JSON.parse(config.insertManyColumns || "[]")
            const built = buildInsertMany({
              schema: config.schemaName || "public",
              table: config.tableName,
              rows: rows as Record<string, unknown>[],
              columns: columns.length > 0 ? columns : undefined,
              returnData: config.returnData ?? true,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              inputCount: rows.length,
              operation: "INSERT_MANY",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── UPDATE ───────────────────────────────────────────────────────
          case "UPDATE": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/UPDATE: Table Name is required.")
            }
            if (!config.updateData) {
              throw new NonRetriableError("Postgres/UPDATE: Update Data is required.")
            }

            const rawData = r(config.updateData)
            let data: Record<string, unknown>
            try {
              data = JSON.parse(rawData) as Record<string, unknown>
            } catch {
              throw new NonRetriableError(`Postgres/UPDATE: Update Data must be a JSON object.`)
            }

            const resolvedData: Record<string, unknown> = {}
            for (const [key, val] of Object.entries(data)) {
              resolvedData[key] = typeof val === "string" ? r(val) : val
            }

            const where = parseWhereConditions(config.whereConditions, r)

            const built = buildUpdate({
              schema: config.schemaName || "public",
              table: config.tableName,
              data: resolvedData,
              where,
              returnData: config.returnData ?? true,
              allowFullTableUpdate: (config as any).allowFullTableUpdate ?? false,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              operation: "UPDATE",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── DELETE ───────────────────────────────────────────────────────
          case "DELETE": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/DELETE: Table Name is required.")
            }

            const where = parseWhereConditions(config.whereConditions, r)
            if (where.length === 0) {
              throw new NonRetriableError(
                "Postgres/DELETE: WHERE conditions are required. " +
                "A DELETE without WHERE would delete ALL rows in the table."
              )
            }

            const built = buildDelete({
              schema: config.schemaName || "public",
              table: config.tableName,
              where,
              returnData: config.returnData ?? true,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              operation: "DELETE",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── UPSERT ───────────────────────────────────────────────────────
          case "UPSERT": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/UPSERT: Table Name is required.")
            }
            if (!config.insertData) {
              throw new NonRetriableError("Postgres/UPSERT: Insert Data is required.")
            }

            const conflictColumns: string[] = JSON.parse(config.conflictColumns || "[]")
            if (conflictColumns.length === 0) {
              throw new NonRetriableError(
                "Postgres/UPSERT: At least one Conflict Column is required."
              )
            }

            const rawData = r(config.insertData)
            let data: Record<string, unknown>
            try {
              data = JSON.parse(rawData) as Record<string, unknown>
            } catch {
              throw new NonRetriableError("Postgres/UPSERT: Insert Data must be a JSON object.")
            }

            const resolvedData: Record<string, unknown> = {}
            for (const [key, val] of Object.entries(data)) {
              resolvedData[key] = typeof val === "string" ? r(val) : val
            }

            const updateColumns: string[] = JSON.parse(config.updateOnConflict || "[]")

            const built = buildUpsert({
              schema: config.schemaName || "public",
              table: config.tableName,
              data: resolvedData,
              conflictColumns,
              updateColumns,
              returnData: config.returnData ?? true,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 1)
            return {
              row: queryResult.rows[0] ?? null,
              rowCount: queryResult.rowCount,
              operation: "UPSERT",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── EXECUTE_TRANSACTION ──────────────────────────────────────────
          case "EXECUTE_TRANSACTION": {
            let statements: TransactionStatement[] = []
            try {
              statements = JSON.parse(config.transactionStatements || "[]")
            } catch {
              throw new NonRetriableError("Postgres/EXECUTE_TRANSACTION: statements must be valid JSON.")
            }

            if (statements.length === 0) {
              throw new NonRetriableError("Postgres/EXECUTE_TRANSACTION: No statements configured.")
            }

            const resolvedStatements = statements.map((stmt) => ({
              sql: r(stmt.query),
              params: (JSON.parse(stmt.params || "[]") as unknown[]).map((p) =>
                typeof p === "string" ? r(p) : p
              ),
            }))

            const txResult = await executeTransaction(client, resolvedStatements)
            return {
              results: txResult.results,
              committed: txResult.committed,
              statementCount: statements.length,
              operation: "EXECUTE_TRANSACTION",
              timestamp: new Date().toISOString(),
            }
          }

          // ── GET_TABLE_SCHEMA ─────────────────────────────────────────────
          case "GET_TABLE_SCHEMA": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/GET_TABLE_SCHEMA: Table Name is required.")
            }

            const schemaSQL = `
              SELECT
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                tc.constraint_type
              FROM information_schema.columns c
              LEFT JOIN information_schema.key_column_usage kcu
                ON c.column_name = kcu.column_name
                AND c.table_name = kcu.table_name
                AND c.table_schema = kcu.table_schema
              LEFT JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
              WHERE c.table_schema = $1 AND c.table_name = $2
              ORDER BY c.ordinal_position
            `

            const indexSQL = `
              SELECT indexname, indexdef
              FROM pg_indexes
              WHERE schemaname = $1 AND tablename = $2
            `

            const [colResult, idxResult] = await Promise.all([
              executeQuery(client, schemaSQL, [config.schemaName || "public", config.tableName], 1000),
              executeQuery(client, indexSQL, [config.schemaName || "public", config.tableName], 100),
            ])

            return {
              columns: colResult.rows,
              indexes: idxResult.rows,
              columnCount: colResult.rowCount,
              operation: "GET_TABLE_SCHEMA",
              table: config.tableName,
              schema: config.schemaName || "public",
              timestamp: new Date().toISOString(),
            }
          }

          // ── LIST_TABLES ──────────────────────────────────────────────────
          case "LIST_TABLES": {
            const sql = `
              SELECT
                table_name,
                table_type,
                table_schema
              FROM information_schema.tables
              WHERE table_schema = $1
              ORDER BY table_name
            `
            const queryResult = await executeQuery(
              client, sql, [config.schemaName || "public"], 1000
            )
            return {
              tables: queryResult.rows,
              count: queryResult.rowCount,
              schema: config.schemaName || "public",
              operation: "LIST_TABLES",
              timestamp: new Date().toISOString(),
            }
          }

          // ── LIST_SCHEMAS ─────────────────────────────────────────────────
          case "LIST_SCHEMAS": {
            const sql = `
              SELECT schema_name, schema_owner
              FROM information_schema.schemata
              WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast')
              ORDER BY schema_name
            `
            const queryResult = await executeQuery(client, sql, [], 100)
            return {
              schemas: queryResult.rows,
              count: queryResult.rowCount,
              operation: "LIST_SCHEMAS",
              timestamp: new Date().toISOString(),
            }
          }

          // ── CREATE_TABLE ─────────────────────────────────────────────────
          case "CREATE_TABLE": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/CREATE_TABLE: Table Name is required.")
            }

            let columns: ColumnDefinition[] = []
            try {
              columns = JSON.parse(config.columnDefinitions || "[]")
            } catch {
              throw new NonRetriableError("Postgres/CREATE_TABLE: Column definitions must be valid JSON.")
            }

            if (columns.length === 0) {
              throw new NonRetriableError("Postgres/CREATE_TABLE: At least one column is required.")
            }

            const built = buildCreateTable({
              schema: config.schemaName || "public",
              table: config.tableName,
              columns,
              ifNotExists: config.createTableIfNotExists ?? true,
            })

            await executeQuery(client, built.sql, [], 0)
            return {
              created: true,
              table: config.tableName,
              schema: config.schemaName || "public",
              columnCount: columns.length,
              operation: "CREATE_TABLE",
              timestamp: new Date().toISOString(),
            }
          }

          // ── DROP_TABLE ───────────────────────────────────────────────────
          case "DROP_TABLE": {
            if (!config.tableName) {
              throw new NonRetriableError("Postgres/DROP_TABLE: Table Name is required.")
            }

            const schema = config.schemaName || "public"
            // Needs quotes for identifier safety
            const sql = `DROP TABLE IF EXISTS "${schema}"."${config.tableName}"`
            await executeQuery(client, sql, [], 0)
            return {
              dropped: true,
              table: config.tableName,
              schema,
              operation: "DROP_TABLE",
              timestamp: new Date().toISOString(),
            }
          }

          // ── EXECUTE_FUNCTION ─────────────────────────────────────────────
          case "EXECUTE_FUNCTION": {
            if (!config.functionName) {
              throw new NonRetriableError("Postgres/EXECUTE_FUNCTION: Function Name is required.")
            }

            let args: unknown[] = []
            try {
              const rawArgs = JSON.parse(config.functionArgs || "[]") as unknown[]
              args = rawArgs.map((a) => typeof a === "string" ? r(a) : a)
            } catch {
              throw new NonRetriableError("Postgres/EXECUTE_FUNCTION: Function args must be a valid JSON array.")
            }

            const placeholders = args.map((_, i) => `$${i + 1}`).join(", ")
            const sql = `SELECT * FROM ${config.functionName}(${placeholders})`
            const queryResult = await executeQuery(client, sql, args, 10000)

            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              functionName: config.functionName,
              operation: "EXECUTE_FUNCTION",
              timestamp: new Date().toISOString(),
            }
          }

          // ── EXECUTE_EXPLAIN ──────────────────────────────────────────────
          case "EXECUTE_EXPLAIN": {
            const sql = r(config.query)
            if (!sql.trim()) throw new NonRetriableError("Postgres/EXECUTE_EXPLAIN: Query is required.")

            const explainSQL = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`
            const queryResult = await executeQuery(client, explainSQL, [], 1)
            const plan = queryResult.rows[0]?.["QUERY PLAN"]

            return {
              plan: plan,
              query: sql,
              operation: "EXECUTE_EXPLAIN",
              timestamp: new Date().toISOString(),
            }
          }

          // ── FULL_TEXT_SEARCH ─────────────────────────────────────────────
          case "FULL_TEXT_SEARCH": {
            if (!config.tableName) throw new NonRetriableError("Postgres/FULL_TEXT_SEARCH: Table is required.")
            if (!config.searchColumn) throw new NonRetriableError("Postgres/FULL_TEXT_SEARCH: Search Column is required.")
            if (!config.searchQuery) throw new NonRetriableError("Postgres/FULL_TEXT_SEARCH: Search Query is required.")

            const built = buildFullTextSearch({
              schema: config.schemaName || "public",
              table: config.tableName,
              column: config.searchColumn,
              query: r(config.searchQuery),
              language: config.searchLanguage || "english",
              limit: config.searchLimit || 10,
              returnColumns: JSON.parse(config.selectColumns || "[]"),
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 1000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              searchQuery: r(config.searchQuery),
              operation: "FULL_TEXT_SEARCH",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── JSON_PATH_QUERY ──────────────────────────────────────────────
          case "JSON_PATH_QUERY": {
            if (!config.tableName) throw new NonRetriableError("Postgres/JSON_PATH_QUERY: Table is required.")
            if (!config.jsonColumn) throw new NonRetriableError("Postgres/JSON_PATH_QUERY: JSON Column is required.")
            if (!config.jsonPath) throw new NonRetriableError("Postgres/JSON_PATH_QUERY: JSON Path is required.")

            const where = parseWhereConditions(config.whereConditions, r)
            const built = buildJsonPathQuery({
              schema: config.schemaName || "public",
              table: config.tableName,
              column: config.jsonColumn,
              jsonPath: r(config.jsonPath),
              where,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              operation: "JSON_PATH_QUERY",
              table: config.tableName,
              jsonPath: config.jsonPath,
              timestamp: new Date().toISOString(),
            }
          }

          // ── JSON_SET_FIELD ───────────────────────────────────────────────
          case "JSON_SET_FIELD": {
            if (!config.tableName) throw new NonRetriableError("Postgres/JSON_SET_FIELD: Table is required.")
            if (!config.jsonSetColumn) throw new NonRetriableError("Postgres/JSON_SET_FIELD: JSON Column is required.")
            if (!config.jsonSetPath) throw new NonRetriableError("Postgres/JSON_SET_FIELD: JSON Path is required.")

            const where = parseWhereConditions(config.whereConditions, r)
            const built = buildJsonSetField({
              schema: config.schemaName || "public",
              table: config.tableName,
              column: config.jsonSetColumn,
              path: config.jsonSetPath,
              value: r(config.jsonSetValue),
              where,
              returnData: config.returnData ?? true,
            })

            const queryResult = await executeQuery(client, built.sql, built.params, 10000)
            return {
              rows: queryResult.rows,
              rowCount: queryResult.rowCount,
              operation: "JSON_SET_FIELD",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          // ── JSON_AGGREGATE ───────────────────────────────────────────────
          case "JSON_AGGREGATE": {
            if (!config.tableName) throw new NonRetriableError("Postgres/JSON_AGGREGATE: Table is required.")

            const where = parseWhereConditions(config.whereConditions, r)
            const schema = config.schemaName || "public"
            const columns: string[] = JSON.parse(config.selectColumns || "[]")
            const colList = columns.length > 0
              ? columns.map((c) => `"${c}"`).join(", ")
              : "*"

            let whereClause = ""
            const params: unknown[] = []
            if (where.length > 0) {
              // build simple where using existing buildSelect pattern
              const sel = buildSelect({ schema, table: config.tableName, columns, where, orderBy: [], limit: 0, offset: 0, joins: [] })
              // Extract WHERE portion — use full query with json_agg wrapper
              const innerSQL = sel.sql
              const wrapSQL = `SELECT json_agg(t) AS "jsonArray", COUNT(*) AS "count" FROM (${innerSQL}) t`
              const queryResult = await executeQuery(client, wrapSQL, sel.params, 1)
              return {
                jsonArray: queryResult.rows[0]?.jsonArray ?? [],
                count: parseInt(String(queryResult.rows[0]?.count ?? "0"), 10),
                operation: "JSON_AGGREGATE",
                table: config.tableName,
                timestamp: new Date().toISOString(),
              }
            }

            const sql = `
              SELECT json_agg(t) AS "jsonArray", COUNT(*) AS "count"
              FROM (SELECT ${colList} FROM "${schema}"."${config.tableName}") t
            `
            const queryResult = await executeQuery(client, sql, [], 1)
            return {
              jsonArray: queryResult.rows[0]?.jsonArray ?? [],
              count: parseInt(String(queryResult.rows[0]?.count ?? "0"), 10),
              operation: "JSON_AGGREGATE",
              table: config.tableName,
              timestamp: new Date().toISOString(),
            }
          }

          default:
            throw new NonRetriableError(`Postgres: Unknown operation '${operation}'.`)
        }
      })
    })
  } catch (err) {
    await publish(postgresChannel(nodeId).topics.status({ nodeId, status: "error" }))

    if (err instanceof NonRetriableError) throw err

    if (config.continueOnFail) {
      result = {
        rows: [],
        rowCount: 0,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        operation: config.operation,
        timestamp: new Date().toISOString(),
      }
    } else {
      throw new NonRetriableError(
        `Postgres error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  await publish(postgresChannel(nodeId).topics.status({ nodeId, status: "success" }))

  // Return merged context
  return { ...context, [variableName]: result! }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseWhereConditions(
  raw: string,
  r: (s: string) => string
): WhereCondition[] {
  if (!raw || raw === "[]") return []
  try {
    const conditions = JSON.parse(raw) as WhereCondition[]
    return conditions.map((c) => ({
      ...c,
      value: r(c.value),
      value2: r(c.value2 || ""),
    }))
  } catch (err) {
    throw new NonRetriableError("Invalid whereConditions JSON: " + (err instanceof Error ? err.message : String(err)))
  }
}

function resolveToArray(
  context: Record<string, unknown>,
  path: string
): unknown[] | null {
  // Navigate nested path like "filter.items" or "googleSheets.rows"
  // remove possible brackets just in case, or match literally.
  const cleanPath = path.replace(/[{}]/g, "")
  const parts = cleanPath.split(".")
  let current: unknown = context
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return null
    current = (current as Record<string, unknown>)[part]
  }
  return Array.isArray(current) ? current : null
}
