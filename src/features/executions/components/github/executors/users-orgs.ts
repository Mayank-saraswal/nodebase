import { GitHubOperation } from "@/generated/prisma";
import { GitHubClient } from "../api-client";
import { GitHubConfig } from "../types";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { NonRetriableError } from "inngest";

/** Safely cast an options value to string (empty string if null/undefined/object). */
const opt = (v: unknown): string => (v != null && typeof v !== "object" ? String(v) : "");

/**
 * Handles User, Org, Secret, Environment, and Package operations.
 * Maps to spec sections: 10 (User - 5), 11 (Org - 8), 16 (Environment - 10), 17 (Secrets - 12), 19 (Packages - 10)
 */
export async function executeUserOrgOperations(
  client: GitHubClient,
  config: GitHubConfig,
  resolved: { owner?: string; repo?: string; context: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const { owner, repo, context } = resolved;

  switch (config.operation) {
    // ── User Operations (5) ────────────────────────────────────────
    case GitHubOperation.USER_GET_CURRENT: {
      const data = await client.request("/user");
      return {
        userId: data.id, login: data.login, name: data.name,
        email: data.email, avatarUrl: data.avatar_url, bio: data.bio,
        blog: data.blog, location: data.location, company: data.company,
        publicRepos: data.public_repos, followers: data.followers,
        following: data.following, createdAt: data.created_at,
        htmlUrl: data.html_url, type: data.type,
      };
    }

    case GitHubOperation.USER_GET: {
      const username = resolveTemplate(opt(config.options?.username) || opt(owner) || "", context);
      const data = await client.request(`/users/${username}`);
      return {
        userId: data.id, login: data.login, name: data.name,
        email: data.email, avatarUrl: data.avatar_url, bio: data.bio,
        blog: data.blog, location: data.location, company: data.company,
        publicRepos: data.public_repos, publicGists: data.public_gists,
        followers: data.followers, following: data.following,
        createdAt: data.created_at, updatedAt: data.updated_at,
        twitterUsername: data.twitter_username, htmlUrl: data.html_url,
        type: data.type,
      };
    }

    case GitHubOperation.USER_LIST_REPOS: {
      const username = resolveTemplate(opt(config.options?.username) || opt(owner) || "", context);
      let endpoint = `/users/${username}/repos?per_page=${config.perPage || 30}`;
      if (config.options?.type) endpoint += `&type=${opt(config.options.type)}`;
      if (config.options?.sort) endpoint += `&sort=${opt(config.options.sort)}`;
      if (config.options?.direction) endpoint += `&direction=${opt(config.options.direction)}`;
      return client.request(endpoint);
    }

    case GitHubOperation.USER_LIST_FOLLOWERS: {
      const username = resolveTemplate(opt(config.options?.username) || opt(owner) || "", context);
      return client.request(`/users/${username}/followers?per_page=${config.perPage || 30}`);
    }

    case GitHubOperation.USER_LIST_FOLLOWING: {
      const username = resolveTemplate(opt(config.options?.username) || opt(owner) || "", context);
      return client.request(`/users/${username}/following?per_page=${config.perPage || 30}`);
    }

    // ── Organization Operations (8) ────────────────────────────────
    case GitHubOperation.ORG_GET: {
      const data = await client.request(`/orgs/${owner}`);
      return {
        orgId: data.id, login: data.login, name: data.name,
        description: data.description, avatarUrl: data.avatar_url,
        htmlUrl: data.html_url, publicRepos: data.public_repos,
        createdAt: data.created_at, location: data.location,
        email: data.email, blog: data.blog,
        twitterUsername: data.twitter_username,
      };
    }

    case GitHubOperation.ORG_LIST: {
      const username = config.options?.username;
      const endpoint = username ? `/users/${opt(username)}/orgs` : "/user/orgs";
      return client.request(`${endpoint}?per_page=${config.perPage || 30}`);
    }

    case GitHubOperation.ORG_LIST_MEMBERS: {
      let endpoint = `/orgs/${owner}/members?per_page=${config.perPage || 30}`;
      if (config.options?.filter) endpoint += `&filter=${opt(config.options.filter)}`;
      if (config.options?.role) endpoint += `&role=${opt(config.options.role)}`;
      return client.request(endpoint);
    }

    case GitHubOperation.ORG_LIST_TEAMS:
      return client.request(`/orgs/${owner}/teams?per_page=${config.perPage || 30}`);

    case GitHubOperation.ORG_LIST_REPOS: {
      let endpoint = `/orgs/${owner}/repos?per_page=${config.perPage || 30}`;
      if (config.options?.type) endpoint += `&type=${opt(config.options.type)}`;
      if (config.options?.sort) endpoint += `&sort=${opt(config.options.sort)}`;
      return client.request(endpoint);
    }

    case GitHubOperation.ORG_CREATE_REPO: {
      const body: Record<string, unknown> = {
        name: resolveTemplate(config.repo || "", context),
        description: resolveTemplate(config.body || "", context),
        private: config.options?.private ?? false,
        auto_init: config.options?.autoInit ?? true,
      };
      return client.request(`/orgs/${owner}/repos`, { method: "POST", body });
    }

    case GitHubOperation.ORG_INVITE_MEMBER: {
      const username = resolveTemplate(opt(config.options?.username) || "", context);
      const body: Record<string, unknown> = {};
      if (config.options?.role) body.role = opt(config.options.role);
      return client.request(`/orgs/${owner}/memberships/${username}`, { method: "PUT", body });
    }

    case GitHubOperation.ORG_REMOVE_MEMBER: {
      const username = resolveTemplate(opt(config.options?.username) || "", context);
      await client.request(`/orgs/${owner}/members/${username}`, { method: "DELETE" });
      return { success: true, removedUser: username };
    }

    // ── Secret Operations (12) ─────────────────────────────────────
    case GitHubOperation.SECRET_LIST_REPO:
      return client.request(`/repos/${owner}/${repo}/actions/secrets?per_page=${config.perPage || 30}`);

    case GitHubOperation.SECRET_GET_REPO: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      return client.request(`/repos/${owner}/${repo}/actions/secrets/${secretName}`);
    }

    case GitHubOperation.SECRET_CREATE_REPO: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || opt(config.title) || "", context);
      if (!config.options?.encryptedValue || !config.options?.keyId) {
        throw new NonRetriableError(
          "Creating secrets requires encryptedValue and keyId. " +
          "First use SECRET_GET_PUBLIC_KEY to get the key, encrypt with libsodium, then provide encryptedValue and keyId."
        );
      }
      return client.request(`/repos/${owner}/${repo}/actions/secrets/${secretName}`, {
        method: "PUT",
        body: { encrypted_value: config.options.encryptedValue, key_id: config.options.keyId },
      });
    }

    case GitHubOperation.SECRET_DELETE_REPO: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      await client.request(`/repos/${owner}/${repo}/actions/secrets/${secretName}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.SECRET_LIST_ORG:
      return client.request(`/orgs/${owner}/actions/secrets?per_page=${config.perPage || 30}`);

    case GitHubOperation.SECRET_GET_ORG: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      return client.request(`/orgs/${owner}/actions/secrets/${secretName}`);
    }

    case GitHubOperation.SECRET_CREATE_ORG: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      if (!config.options?.encryptedValue || !config.options?.keyId) {
        throw new NonRetriableError("Creating org secrets requires encryptedValue and keyId.");
      }
      const body: Record<string, unknown> = {
        encrypted_value: config.options.encryptedValue,
        key_id: config.options.keyId,
        visibility: opt(config.options?.visibility) || "all",
      };
      if (config.options?.selectedRepositoryIds) body.selected_repository_ids = config.options.selectedRepositoryIds;
      return client.request(`/orgs/${owner}/actions/secrets/${secretName}`, { method: "PUT", body });
    }

    case GitHubOperation.SECRET_DELETE_ORG: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      await client.request(`/orgs/${owner}/actions/secrets/${secretName}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.SECRET_GET_PUBLIC_KEY:
      return client.request(`/repos/${owner}/${repo}/actions/secrets/public-key`);

    case GitHubOperation.SECRET_GET_ORG_PUBLIC_KEY:
      return client.request(`/orgs/${owner}/actions/secrets/public-key`);

    case GitHubOperation.SECRET_LIST_SELECTED_REPOS: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      return client.request(`/orgs/${owner}/actions/secrets/${secretName}/repositories`);
    }

    case GitHubOperation.SECRET_SET_SELECTED_REPOS: {
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      return client.request(`/orgs/${owner}/actions/secrets/${secretName}/repositories`, {
        method: "PUT",
        body: { selected_repository_ids: config.options?.selectedRepositoryIds || [] },
      });
    }

    // ── Environment Operations (10) ────────────────────────────────
    case GitHubOperation.ENVIRONMENT_LIST:
      return client.request(`/repos/${owner}/${repo}/environments`);

    case GitHubOperation.ENVIRONMENT_GET: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      return client.request(`/repos/${owner}/${repo}/environments/${envName}`);
    }

    case GitHubOperation.ENVIRONMENT_CREATE:
    case GitHubOperation.ENVIRONMENT_UPDATE: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      const body: Record<string, unknown> = {};
      if (config.options?.waitTimer !== undefined) body.wait_timer = config.options.waitTimer;
      if (config.options?.reviewers) body.reviewers = config.options.reviewers;
      if (config.options?.deploymentBranchPolicy) body.deployment_branch_policy = config.options.deploymentBranchPolicy;
      return client.request(`/repos/${owner}/${repo}/environments/${envName}`, { method: "PUT", body });
    }

    case GitHubOperation.ENVIRONMENT_DELETE: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      await client.request(`/repos/${owner}/${repo}/environments/${envName}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.ENVIRONMENT_LIST_SECRETS: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      return client.request(`/repos/${owner}/${repo}/environments/${envName}/secrets`);
    }

    case GitHubOperation.ENVIRONMENT_GET_SECRET: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      return client.request(`/repos/${owner}/${repo}/environments/${envName}/secrets/${secretName}`);
    }

    case GitHubOperation.ENVIRONMENT_CREATE_SECRET: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      if (!config.options?.encryptedValue || !config.options?.keyId) {
        throw new NonRetriableError("Creating environment secrets requires encryptedValue and keyId.");
      }
      return client.request(
        `/repos/${owner}/${repo}/environments/${envName}/secrets/${secretName}`,
        { method: "PUT", body: { encrypted_value: config.options.encryptedValue, key_id: config.options.keyId } }
      );
    }

    case GitHubOperation.ENVIRONMENT_DELETE_SECRET: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      const secretName = resolveTemplate(opt(config.options?.secretName) || "", context);
      await client.request(
        `/repos/${owner}/${repo}/environments/${envName}/secrets/${secretName}`,
        { method: "DELETE" }
      );
      return { success: true };
    }

    case GitHubOperation.ENVIRONMENT_LIST_PROTECTION_RULES: {
      const envName = resolveTemplate(opt(config.options?.environmentName) || "", context);
      return client.request(`/repos/${owner}/${repo}/environments/${envName}`);
    }

    // ── Package Operations (10) ────────────────────────────────────
    case GitHubOperation.PACKAGE_LIST_FOR_USER: {
      const username = resolveTemplate(opt(config.options?.username) || opt(owner) || "", context);
      let endpoint = `/users/${username}/packages?per_page=${config.perPage || 30}`;
      if (config.options?.packageType) endpoint += `&package_type=${opt(config.options.packageType)}`;
      return client.request(endpoint);
    }

    case GitHubOperation.PACKAGE_LIST_FOR_ORG: {
      let endpoint = `/orgs/${owner}/packages?per_page=${config.perPage || 30}`;
      if (config.options?.packageType) endpoint += `&package_type=${opt(config.options.packageType)}`;
      if (config.state) endpoint += `&state=${config.state}`;
      return client.request(endpoint);
    }

    case GitHubOperation.PACKAGE_GET: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      return client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}`);
    }

    case GitHubOperation.PACKAGE_DELETE: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      await client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.PACKAGE_RESTORE: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      await client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}/restore`, { method: "POST" });
      return { success: true };
    }

    case GitHubOperation.PACKAGE_LIST_VERSIONS: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      return client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}/versions?per_page=${config.perPage || 30}`);
    }

    case GitHubOperation.PACKAGE_GET_VERSION: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      const versionId = opt(config.options?.versionId);
      return client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}/versions/${versionId}`);
    }

    case GitHubOperation.PACKAGE_DELETE_VERSION: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      const versionId = opt(config.options?.versionId);
      await client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}/versions/${versionId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.PACKAGE_RESTORE_VERSION: {
      const pkgType = opt(config.options?.packageType) || "npm";
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      const versionId = opt(config.options?.versionId);
      await client.request(`/orgs/${owner}/packages/${pkgType}/${pkgName}/versions/${versionId}/restore`, { method: "POST" });
      return { success: true };
    }

    case GitHubOperation.PACKAGE_LIST_DOCKER_IMAGES: {
      const pkgName = resolveTemplate(opt(config.options?.packageName) || "", context);
      return client.request(`/orgs/${owner}/packages/container/${pkgName}/versions?per_page=${config.perPage || 30}`);
    }

    default:
      throw new NonRetriableError(
        `Unsupported user/org/secret/environment/package operation: ${config.operation}`
      );
  }
}
