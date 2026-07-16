# HubSpot operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/hubspot` (`hubspot.api.*`).

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Contacts | get, getMany, create, update, delete, getRecentlyCreated, getRecentlyUpdated, search | CREATE/GET/UPDATE/DELETE/SEARCH_CONTACT* |
| Companies | get, getMany, create, update, delete, getRecently*, searchByDomain | CREATE/GET/UPDATE/DELETE/SEARCH_COMPANY* |
| Deals | get, getMany, create, update, delete, getRecently*, search | CREATE/GET/UPDATE/DELETE/SEARCH_DEAL*, UPDATE_DEAL_STAGE |
| Tickets | get, getMany, create, update, delete | CREATE/GET/UPDATE/DELETE/SEARCH_TICKET* |
| Engagements | get, getMany, create, delete | CREATE_NOTE/TASK/CALL/EMAIL_LOG |
| Lists | addContact, removeContact | ADD/REMOVE_CONTACT_TO_LIST |

Completeness test asserts registry ⊇ all nested endpoints above.

Product-only legacy (not in package): GET_CONTACT_PROPERTIES, GET_CONTACT_ASSOCIATIONS, CREATE_ASSOCIATION, SEARCH_OBJECTS, GET_PROPERTIES, GET_LIST_CONTACTS — dual-path falls to native executor.
