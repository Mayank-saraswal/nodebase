import { GitHubOperation } from "@/generated/prisma";
import { GitHubClient } from "../api-client";
import { GitHubConfig } from "../types";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { NonRetriableError } from "inngest";
/** Safely cast an options value to string (empty string if null/undefined/object). */
const opt = (v: unknown): string => (v != null && typeof v !== "object" ? String(v) : "");



/**
 * Handles Search, Codespaces, Copilot, Rulesets, Projects V2, Attestations, and Security Advisories.
 * Maps to spec sections: 9 (Search - 7), 13 (Codespaces - 12), 14 (Copilot - 15),
 *   15 (Rulesets - 8), 20 (Attestations - 5), 23 (Projects V2 - 12), 24 (Security Advisories - 6)
 */
export async function executeSearchMiscOperations(
  client: GitHubClient,
  config: GitHubConfig,
  resolved: { owner?: string; repo?: string; context: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const { owner, repo, context } = resolved;
  const query = encodeURIComponent(resolveTemplate(config.searchQuery || "", context));

  switch (config.operation) {
    // ── Search Operations (7) ──────────────────────────────────────
    case GitHubOperation.SEARCH_REPOSITORIES: {
      const sort = config.options?.sort || "";
      const order = config.options?.order || "desc";
      let endpoint = `/search/repositories?q=${query}&per_page=${config.perPage || 30}`;
      if (sort) endpoint += `&sort=${sort}`;
      endpoint += `&order=${order}`;
      const data = await client.request(endpoint);
      return {
        totalCount: data.total_count,
        incompleteResults: data.incomplete_results,
        items: data.items?.map((r: any) => ({
          id: r.id, name: r.name, fullName: r.full_name,
          owner: r.owner?.login, description: r.description,
          url: r.html_url, stars: r.stargazers_count,
          forks: r.forks_count, language: r.language,
          updatedAt: r.updated_at,
        })) || [],
      };
    }

    case GitHubOperation.SEARCH_ISSUES: {
      const sort = config.options?.sort || "";
      let endpoint = `/search/issues?q=${query}&per_page=${config.perPage || 30}`;
      if (sort) endpoint += `&sort=${sort}`;
      const data = await client.request(endpoint);
      return {
        totalCount: data.total_count,
        items: data.items?.map((i: any) => ({
          id: i.id, number: i.number, title: i.title,
          state: i.state, url: i.html_url, user: i.user?.login,
          labels: i.labels?.map((l: any) => l.name),
          createdAt: i.created_at,
        })) || [],
      };
    }

    case GitHubOperation.SEARCH_PULL_REQUESTS: {
      // GitHub search API uses the same endpoint; add is:pr to the query
      const prQuery = encodeURIComponent(`is:pr ${resolveTemplate(config.searchQuery || "", context)}`);
      const data = await client.request(`/search/issues?q=${prQuery}&per_page=${config.perPage || 30}`);
      return { totalCount: data.total_count, items: data.items || [] };
    }

    case GitHubOperation.SEARCH_CODE: {
      const data = await client.request(`/search/code?q=${query}&per_page=${config.perPage || 30}`);
      return {
        totalCount: data.total_count,
        items: data.items?.map((c: any) => ({
          name: c.name, path: c.path, sha: c.sha,
          repository: { name: c.repository?.name, fullName: c.repository?.full_name },
          htmlUrl: c.html_url,
        })) || [],
      };
    }

    case GitHubOperation.SEARCH_USERS: {
      const data = await client.request(`/search/users?q=${query}&per_page=${config.perPage || 30}`);
      return { totalCount: data.total_count, items: data.items || [] };
    }

    case GitHubOperation.SEARCH_COMMITS: {
      const data = await client.request(`/search/commits?q=${query}&per_page=${config.perPage || 30}`, {
        headers: { Accept: "application/vnd.github.cloak-preview+json" },
      });
      return { totalCount: data.total_count, items: data.items || [] };
    }

    case GitHubOperation.SEARCH_TOPICS: {
      const data = await client.request(`/search/topics?q=${query}&per_page=${config.perPage || 30}`, {
        headers: { Accept: "application/vnd.github.mercy-preview+json" },
      });
      return { totalCount: data.total_count, items: data.items || [] };
    }

    // ── Codespace Operations (12) ──────────────────────────────────
    case GitHubOperation.CODESPACES_LIST:
      return client.request("/user/codespaces");

    case GitHubOperation.CODESPACES_GET: {
      const name = resolveTemplate(opt(config.options?.codespaceName) || "", context);
      return client.request(`/user/codespaces/${name}`);
    }

    case GitHubOperation.CODESPACES_CREATE: {
      const body: Record<string, unknown> = {};
      if (config.branch) body.ref = config.branch;
      if (config.options?.location) body.location = config.options.location;
      if (config.options?.machine) body.machine = config.options.machine;
      if (config.options?.devcontainerPath) body.devcontainer_path = config.options.devcontainerPath;
      if (config.options?.workingDirectory) body.working_directory = config.options.workingDirectory;
      const data = await client.request(`/repos/${owner}/${repo}/codespaces`, { method: "POST", body });
      return {
        codespaceId: data.id, name: data.name, state: data.state,
        url: data.url, webUrl: data.web_url,
      };
    }

    case GitHubOperation.CODESPACES_START: {
      const name = resolveTemplate(opt(config.options?.codespaceName) || "", context);
      return client.request(`/user/codespaces/${name}/start`, { method: "POST" });
    }

    case GitHubOperation.CODESPACES_STOP: {
      const name = resolveTemplate(opt(config.options?.codespaceName) || "", context);
      return client.request(`/user/codespaces/${name}/stop`, { method: "POST" });
    }

    case GitHubOperation.CODESPACES_DELETE: {
      const name = resolveTemplate(opt(config.options?.codespaceName) || "", context);
      await client.request(`/user/codespaces/${name}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.CODESPACES_UPDATE: {
      const name = resolveTemplate(opt(config.options?.codespaceName) || "", context);
      const body: Record<string, unknown> = {};
      if (config.options?.machine) body.machine = config.options.machine;
      if (config.options?.displayName) body.display_name = config.options.displayName;
      return client.request(`/user/codespaces/${name}`, { method: "PATCH", body });
    }

    case GitHubOperation.CODESPACES_EXPORT: {
      const name = resolveTemplate(opt(config.options?.codespaceName) || "", context);
      return client.request(`/user/codespaces/${name}/exports`, { method: "POST" });
    }

    case GitHubOperation.CODESPACES_LIST_FOR_REPO:
      return client.request(`/repos/${owner}/${repo}/codespaces`);

    case GitHubOperation.CODESPACES_LIST_MACHINE_TYPES:
      return client.request(`/repos/${owner}/${repo}/codespaces/machines`);

    case GitHubOperation.CODESPACES_LIST_SECRETS:
      return client.request("/user/codespaces/secrets");

    case GitHubOperation.CODESPACES_CREATE_SECRET: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      return client.request(`/user/codespaces/secrets/${secretName}`, {
        method: "PUT",
        body: {
          encrypted_value: config.options?.encryptedValue,
          key_id: config.options?.keyId,
          selected_repository_ids: config.options?.selectedRepositoryIds || [],
        },
      });
    }

    // ── Copilot Operations (15) ────────────────────────────────────
    case GitHubOperation.COPILOT_LIST_SEATS:
      return client.request(`/orgs/${owner}/copilot/billing/seats`);

    case GitHubOperation.COPILOT_ADD_SEAT: {
      const users = config.options?.users || [];
      return client.request(`/orgs/${owner}/copilot/billing/selected_users`, {
        method: "POST", body: { selected_usernames: users },
      });
    }

    case GitHubOperation.COPILOT_REMOVE_SEAT: {
      const users = config.options?.users || [];
      return client.request(`/orgs/${owner}/copilot/billing/selected_users`, {
        method: "DELETE", body: { selected_usernames: users },
      });
    }

    case GitHubOperation.COPILOT_GET_SETTINGS:
      return client.request(`/orgs/${owner}/copilot/billing`);

    case GitHubOperation.COPILOT_UPDATE_SETTINGS:
      return client.request(`/orgs/${owner}/copilot/billing`, {
        method: "PATCH", body: config.options || {},
      });

    case GitHubOperation.COPILOT_LIST_SPACES:
      return client.request(`/orgs/${owner}/copilot/spaces`);

    case GitHubOperation.COPILOT_GET_SPACE: {
      const spaceId = config.options?.spaceId;
      return client.request(`/orgs/${owner}/copilot/spaces/${spaceId}`);
    }

    case GitHubOperation.COPILOT_CREATE_SPACE: {
      const body: Record<string, unknown> = {
        name: resolveTemplate(config.title || "", context),
      };
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.options?.visibility) body.visibility = config.options.visibility;
      if (config.options?.repositories) body.repositories = config.options.repositories;
      return client.request(`/orgs/${owner}/copilot/spaces`, { method: "POST", body });
    }

    case GitHubOperation.COPILOT_UPDATE_SPACE: {
      const spaceId = config.options?.spaceId;
      const body: Record<string, unknown> = {};
      if (config.title) body.name = resolveTemplate(config.title, context);
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.options?.visibility) body.visibility = config.options.visibility;
      return client.request(`/orgs/${owner}/copilot/spaces/${spaceId}`, { method: "PATCH", body });
    }

    case GitHubOperation.COPILOT_DELETE_SPACE: {
      const spaceId = config.options?.spaceId;
      await client.request(`/orgs/${owner}/copilot/spaces/${spaceId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.COPILOT_LIST_SPACE_RESOURCES: {
      const spaceId = config.options?.spaceId;
      return client.request(`/orgs/${owner}/copilot/spaces/${spaceId}/resources`);
    }

    case GitHubOperation.COPILOT_ADD_SPACE_RESOURCE: {
      const spaceId = config.options?.spaceId;
      return client.request(`/orgs/${owner}/copilot/spaces/${spaceId}/resources`, {
        method: "POST", body: (config.options?.resource as Record<string, unknown>) || {},
      });
    }

    case GitHubOperation.COPILOT_REMOVE_SPACE_RESOURCE: {
      const spaceId = config.options?.spaceId;
      const resourceId = config.options?.resourceId;
      await client.request(`/orgs/${owner}/copilot/spaces/${spaceId}/resources/${resourceId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.COPILOT_GET_AGENT_POLICY:
      return client.request(`/orgs/${owner}/copilot/policies`);

    case GitHubOperation.COPILOT_UPDATE_AGENT_POLICY:
      return client.request(`/orgs/${owner}/copilot/policies`, {
        method: "PUT", body: config.options || {},
      });

    // ── Ruleset Operations (8) ─────────────────────────────────────
    case GitHubOperation.RULESET_LIST:
      return client.request(`/repos/${owner}/${repo}/rulesets`);

    case GitHubOperation.RULESET_GET: {
      const rulesetId = config.options?.rulesetId;
      return client.request(`/repos/${owner}/${repo}/rulesets/${rulesetId}`);
    }

    case GitHubOperation.RULESET_CREATE: {
      const body: Record<string, unknown> = {
        name: resolveTemplate(config.title || "", context),
        target: config.options?.target || "branch",
        enforcement: config.options?.enforcement || "active",
        rules: config.options?.rules || [],
      };
      if (config.options?.bypassActors) body.bypass_actors = config.options.bypassActors;
      if (config.options?.conditions) body.conditions = config.options.conditions;
      return client.request(`/repos/${owner}/${repo}/rulesets`, { method: "POST", body });
    }

    case GitHubOperation.RULESET_UPDATE: {
      const rulesetId = config.options?.rulesetId;
      const body: Record<string, unknown> = {};
      if (config.title) body.name = resolveTemplate(config.title, context);
      if (config.options?.enforcement) body.enforcement = config.options.enforcement;
      if (config.options?.rules) body.rules = config.options.rules;
      return client.request(`/repos/${owner}/${repo}/rulesets/${rulesetId}`, { method: "PUT", body });
    }

    case GitHubOperation.RULESET_DELETE: {
      const rulesetId = config.options?.rulesetId;
      await client.request(`/repos/${owner}/${repo}/rulesets/${rulesetId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.RULESET_LIST_RULE_EVALUATIONS:
      return client.request(`/repos/${owner}/${repo}/rulesets/rule-suites`);

    case GitHubOperation.RULESET_GET_RULE_SUITE: {
      const suiteId = config.options?.suiteId;
      return client.request(`/repos/${owner}/${repo}/rulesets/rule-suites/${suiteId}`);
    }

    case GitHubOperation.RULESET_LIST_ORG_RULESETS:
      return client.request(`/orgs/${owner}/rulesets`);

    // ── Projects V2 Operations (12) ────────────────────────────────
    case GitHubOperation.PROJECT_V2_LIST:
      return client.request(`/orgs/${owner}/projects?per_page=${config.perPage || 30}`);

    case GitHubOperation.PROJECT_V2_GET: {
      const projectId = config.options?.projectId;
      return client.request(`/projects/${projectId}`);
    }

    case GitHubOperation.PROJECT_V2_CREATE: {
      const body: Record<string, unknown> = {
        name: resolveTemplate(config.title || "", context),
      };
      if (config.body) body.body = resolveTemplate(config.body, context);
      return client.request(`/orgs/${owner}/projects`, { method: "POST", body });
    }

    case GitHubOperation.PROJECT_V2_UPDATE: {
      const projectId = config.options?.projectId;
      const body: Record<string, unknown> = {};
      if (config.title) body.name = resolveTemplate(config.title, context);
      if (config.body) body.body = resolveTemplate(config.body, context);
      return client.request(`/projects/${projectId}`, { method: "PATCH", body });
    }

    case GitHubOperation.PROJECT_V2_DELETE: {
      const projectId = config.options?.projectId;
      await client.request(`/projects/${projectId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.PROJECT_V2_LIST_ITEMS: {
      const projectId = config.options?.projectId;
      return client.request(`/projects/${projectId}/columns?per_page=${config.perPage || 30}`);
    }

    case GitHubOperation.PROJECT_V2_ADD_ITEM: {
      const projectId = config.options?.projectId;
      return client.request(`/projects/${projectId}/columns`, {
        method: "POST", body: { content_id: config.options?.contentId, content_type: config.options?.contentType },
      });
    }

    case GitHubOperation.PROJECT_V2_UPDATE_ITEM: {
      const columnId = config.options?.columnId;
      return client.request(`/projects/columns/cards/${columnId}`, {
        method: "PATCH", body: config.options || {},
      });
    }

    case GitHubOperation.PROJECT_V2_DELETE_ITEM: {
      const cardId = config.options?.cardId;
      await client.request(`/projects/columns/cards/${cardId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.PROJECT_V2_LIST_FIELDS:
      // Projects V2 fields are only available via GraphQL
      throw new NonRetriableError("PROJECT_V2_LIST_FIELDS requires GitHub GraphQL API.");

    case GitHubOperation.PROJECT_V2_CREATE_FIELD:
      throw new NonRetriableError("PROJECT_V2_CREATE_FIELD requires GitHub GraphQL API.");

    case GitHubOperation.PROJECT_V2_UPDATE_FIELD_VALUE:
      throw new NonRetriableError("PROJECT_V2_UPDATE_FIELD_VALUE requires GitHub GraphQL API.");

    // ── Attestation Operations (5) ─────────────────────────────────
    case GitHubOperation.ATTESTATION_LIST_FOR_REPO:
      return client.request(`/repos/${owner}/${repo}/attestations?per_page=${config.perPage || 30}`);

    case GitHubOperation.ATTESTATION_GET: {
      const attestationId = config.options?.attestationId;
      return client.request(`/repos/${owner}/${repo}/attestations/${attestationId}`);
    }

    case GitHubOperation.ATTESTATION_CREATE: {
      const body: Record<string, unknown> = {
        predicate_type: config.options?.predicateType,
        predicate: config.options?.predicate,
        subject: config.options?.subject,
      };
      return client.request(`/repos/${owner}/${repo}/attestations`, { method: "POST", body });
    }

    case GitHubOperation.ATTESTATION_LIST_FOR_ORG:
      return client.request(`/orgs/${owner}/attestations?per_page=${config.perPage || 30}`);

    case GitHubOperation.ATTESTATION_VERIFY: {
      const digest = config.options?.digest;
      return client.request(`/repos/${owner}/${repo}/attestations/sha256:${digest}`);
    }

    // ── Security Advisory Operations (6) ───────────────────────────
    case GitHubOperation.ADVISORY_LIST:
      return client.request(`/repos/${owner}/${repo}/security-advisories?per_page=${config.perPage || 30}`);

    case GitHubOperation.ADVISORY_GET: {
      const advisoryId = config.options?.advisoryId;
      return client.request(`/repos/${owner}/${repo}/security-advisories/${advisoryId}`);
    }

    case GitHubOperation.ADVISORY_CREATE: {
      const body: Record<string, unknown> = {
        summary: resolveTemplate(config.title || "", context),
        description: resolveTemplate(config.body || "", context),
        severity: config.options?.severity || "medium",
      };
      if (config.options?.vulnerabilities) body.vulnerabilities = config.options.vulnerabilities;
      return client.request(`/repos/${owner}/${repo}/security-advisories`, { method: "POST", body });
    }

    case GitHubOperation.ADVISORY_UPDATE: {
      const advisoryId = config.options?.advisoryId;
      const body: Record<string, unknown> = {};
      if (config.title) body.summary = resolveTemplate(config.title, context);
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.options?.severity) body.severity = config.options.severity;
      return client.request(`/repos/${owner}/${repo}/security-advisories/${advisoryId}`, { method: "PATCH", body });
    }

    case GitHubOperation.ADVISORY_LIST_REPOS_AFFECTED:
      return client.request("/advisories?per_page=" + (config.perPage || 30));

    case GitHubOperation.ADVISORY_REPORT: {
      const body: Record<string, unknown> = {
        summary: resolveTemplate(config.title || "", context),
        description: resolveTemplate(config.body || "", context),
        severity: config.options?.severity || "medium",
      };
      if (config.options?.vulnerabilities) body.vulnerabilities = config.options.vulnerabilities;
      return client.request(`/repos/${owner}/${repo}/security-advisories/reports`, { method: "POST", body });
    }

    default:
      throw new NonRetriableError(
        `Unsupported search/codespaces/copilot/rulesets/projects/advisory operation: ${config.operation}`
      );
  }
}
