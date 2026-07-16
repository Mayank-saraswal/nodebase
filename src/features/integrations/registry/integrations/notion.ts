/**
 * Notion registry (Option C).
 * Canonical keys prefer Corsair paths; product aliases keep existing workflows running.
 */

import type { IntegrationDefinition } from "../types"

export const notionIntegrationDefinition: IntegrationDefinition = {
  typeKey: "notion",
  kind: "integration",
  corsairPluginId: "notion",
  label: "Notion",
  operations: [
    // databases
    {
      key: "databases.getDatabase",
      aliases: ["GET_DATABASE"],
      label: "Get Database",
      group: "Databases",
      risk: "read",
    },
    {
      key: "databases.getManyDatabases",
      aliases: ["LIST_DATABASES"],
      label: "List Databases",
      group: "Databases",
      risk: "read",
    },
    {
      key: "databases.searchDatabase",
      aliases: ["SEARCH_DATABASE"],
      label: "Search Database",
      group: "Databases",
      risk: "read",
    },
    // database pages
    {
      key: "databasePages.createDatabasePage",
      aliases: ["CREATE_DATABASE_PAGE"],
      label: "Create Database Page",
      group: "Database Pages",
      risk: "write",
    },
    {
      key: "databasePages.getDatabasePage",
      aliases: ["GET_PAGE", "GET_DATABASE_PAGE"],
      label: "Get Page",
      group: "Database Pages",
      risk: "read",
    },
    {
      key: "databasePages.getManyDatabasePages",
      aliases: ["QUERY_DATABASE", "LIST_DATABASE_PAGES"],
      label: "Query / List Database Pages",
      group: "Database Pages",
      risk: "read",
    },
    {
      key: "databasePages.updateDatabasePage",
      aliases: ["UPDATE_DATABASE_PAGE"],
      label: "Update Database Page",
      group: "Database Pages",
      risk: "write",
    },
    // pages
    {
      key: "pages.archivePage",
      aliases: ["ARCHIVE_PAGE"],
      label: "Archive Page",
      group: "Pages",
      risk: "destructive",
    },
    {
      key: "pages.createPage",
      aliases: ["CREATE_PAGE"],
      label: "Create Page",
      group: "Pages",
      risk: "write",
    },
    {
      key: "pages.searchPage",
      aliases: ["SEARCH", "SEARCH_PAGE"],
      label: "Search Pages",
      group: "Pages",
      risk: "read",
    },
    // blocks
    {
      key: "blocks.appendBlock",
      aliases: ["APPEND_BLOCK"],
      label: "Append Block",
      group: "Blocks",
      risk: "write",
    },
    {
      key: "blocks.getManyChildBlocks",
      aliases: ["GET_BLOCK_CHILDREN"],
      label: "Get Block Children",
      group: "Blocks",
      risk: "read",
    },
    // users
    {
      key: "users.getUser",
      aliases: ["GET_USER"],
      label: "Get User",
      group: "Users",
      risk: "read",
    },
    {
      key: "users.getManyUsers",
      aliases: ["GET_USERS", "LIST_USERS"],
      label: "List Users",
      group: "Users",
      risk: "read",
    },
  ],
}
