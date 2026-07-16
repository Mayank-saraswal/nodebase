/**
 * HubSpot registry (Option C) — full @corsair-dev/hubspot surface.
 */

import type { IntegrationDefinition } from "../types"

export const hubspotIntegrationDefinition: IntegrationDefinition = {
  typeKey: "hubspot",
  kind: "integration",
  corsairPluginId: "hubspot",
  label: "HubSpot",
  operations: [
    // contacts
    { key: "contacts.get", aliases: ["GET_CONTACT"], label: "Get Contact", group: "Contacts", risk: "read" },
    { key: "contacts.getMany", aliases: ["LIST_CONTACTS"], label: "List Contacts", group: "Contacts", risk: "read" },
    { key: "contacts.create", aliases: ["CREATE_CONTACT"], label: "Create Contact", group: "Contacts", risk: "write" },
    { key: "contacts.update", aliases: ["UPDATE_CONTACT", "UPSERT_CONTACT"], label: "Update Contact", group: "Contacts", risk: "write" },
    { key: "contacts.delete", aliases: ["DELETE_CONTACT"], label: "Delete Contact", group: "Contacts", risk: "destructive" },
    { key: "contacts.getRecentlyCreated", aliases: ["LIST_RECENT_CONTACTS"], label: "Recently Created Contacts", group: "Contacts", risk: "read" },
    { key: "contacts.getRecentlyUpdated", aliases: ["LIST_UPDATED_CONTACTS"], label: "Recently Updated Contacts", group: "Contacts", risk: "read" },
    { key: "contacts.search", aliases: ["SEARCH_CONTACTS"], label: "Search Contacts", group: "Contacts", risk: "read" },
    // companies
    { key: "companies.get", aliases: ["GET_COMPANY"], label: "Get Company", group: "Companies", risk: "read" },
    { key: "companies.getMany", aliases: ["LIST_COMPANIES"], label: "List Companies", group: "Companies", risk: "read" },
    { key: "companies.create", aliases: ["CREATE_COMPANY"], label: "Create Company", group: "Companies", risk: "write" },
    { key: "companies.update", aliases: ["UPDATE_COMPANY"], label: "Update Company", group: "Companies", risk: "write" },
    { key: "companies.delete", aliases: ["DELETE_COMPANY"], label: "Delete Company", group: "Companies", risk: "destructive" },
    { key: "companies.getRecentlyCreated", aliases: ["LIST_RECENT_COMPANIES"], label: "Recently Created Companies", group: "Companies", risk: "read" },
    { key: "companies.getRecentlyUpdated", aliases: ["LIST_UPDATED_COMPANIES"], label: "Recently Updated Companies", group: "Companies", risk: "read" },
    { key: "companies.searchByDomain", aliases: ["SEARCH_COMPANIES", "SEARCH_COMPANIES_BY_DOMAIN"], label: "Search Companies by Domain", group: "Companies", risk: "read" },
    // deals
    { key: "deals.get", aliases: ["GET_DEAL"], label: "Get Deal", group: "Deals", risk: "read" },
    { key: "deals.getMany", aliases: ["LIST_DEALS"], label: "List Deals", group: "Deals", risk: "read" },
    { key: "deals.create", aliases: ["CREATE_DEAL"], label: "Create Deal", group: "Deals", risk: "write" },
    { key: "deals.update", aliases: ["UPDATE_DEAL", "UPDATE_DEAL_STAGE"], label: "Update Deal", group: "Deals", risk: "write" },
    { key: "deals.delete", aliases: ["DELETE_DEAL"], label: "Delete Deal", group: "Deals", risk: "destructive" },
    { key: "deals.getRecentlyCreated", aliases: ["LIST_RECENT_DEALS"], label: "Recently Created Deals", group: "Deals", risk: "read" },
    { key: "deals.getRecentlyUpdated", aliases: ["LIST_UPDATED_DEALS"], label: "Recently Updated Deals", group: "Deals", risk: "read" },
    { key: "deals.search", aliases: ["SEARCH_DEALS"], label: "Search Deals", group: "Deals", risk: "read" },
    // tickets
    { key: "tickets.get", aliases: ["GET_TICKET"], label: "Get Ticket", group: "Tickets", risk: "read" },
    { key: "tickets.getMany", aliases: ["LIST_TICKETS", "SEARCH_TICKETS"], label: "List Tickets", group: "Tickets", risk: "read" },
    { key: "tickets.create", aliases: ["CREATE_TICKET"], label: "Create Ticket", group: "Tickets", risk: "write" },
    { key: "tickets.update", aliases: ["UPDATE_TICKET"], label: "Update Ticket", group: "Tickets", risk: "write" },
    { key: "tickets.delete", aliases: ["DELETE_TICKET"], label: "Delete Ticket", group: "Tickets", risk: "destructive" },
    // engagements
    { key: "engagements.get", aliases: ["GET_ENGAGEMENT"], label: "Get Engagement", group: "Engagements", risk: "read" },
    { key: "engagements.getMany", aliases: ["LIST_ENGAGEMENTS"], label: "List Engagements", group: "Engagements", risk: "read" },
    { key: "engagements.create", aliases: ["CREATE_NOTE", "CREATE_TASK", "CREATE_CALL", "CREATE_EMAIL_LOG", "CREATE_ENGAGEMENT"], label: "Create Engagement", group: "Engagements", risk: "write" },
    { key: "engagements.delete", aliases: ["DELETE_ENGAGEMENT"], label: "Delete Engagement", group: "Engagements", risk: "destructive" },
    // contact lists
    { key: "contactLists.addContact", aliases: ["ADD_CONTACT_TO_LIST"], label: "Add Contact to List", group: "Lists", risk: "write" },
    { key: "contactLists.removeContact", aliases: ["REMOVE_CONTACT_FROM_LIST"], label: "Remove Contact from List", group: "Lists", risk: "write" },
  ],
}
