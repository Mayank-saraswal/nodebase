import { GitHubOperation } from "@/generated/prisma";
import { GitHubClient } from "../api-client";
import { GitHubConfig } from "../types";
import { resolveTemplate } from "@/features/executions/lib/template-resolver";
import { NonRetriableError } from "inngest";

/**
 * Handles all Repository, File, Branch, Release, and Gist operations.
 * Maps to spec sections: 1 (Repository), 4 (File), 5 (Branch), 6 (Release), 8 (Gist)
 */
export async function executeRepositoryOperations(
  client: GitHubClient,
  config: GitHubConfig,
  resolved: { owner?: string; repo?: string; context: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  const { owner, repo, context } = resolved;

  switch (config.operation) {
    // ── Repository Operations (12) ─────────────────────────────────
    case GitHubOperation.REPOSITORY_CREATE: {
      const body: Record<string, unknown> = {
        name: resolveTemplate(config.repo || "", context),
        description: resolveTemplate(config.body || "", context),
        private: config.options?.private ?? false,
        auto_init: config.options?.autoInit ?? true,
      };
      if (config.options?.hasIssues !== undefined) body.has_issues = config.options.hasIssues;
      if (config.options?.hasWiki !== undefined) body.has_wiki = config.options.hasWiki;
      if (config.options?.licenseTemplate) body.license_template = config.options.licenseTemplate;
      if (config.options?.gitignoreTemplate) body.gitignore_template = config.options.gitignoreTemplate;
      const endpoint = owner ? `/orgs/${owner}/repos` : "/user/repos";
      const data = await client.request(endpoint, { method: "POST", body });
      return {
        repositoryId: data.id,
        repositoryName: data.name,
        fullName: data.full_name,
        owner: data.owner?.login,
        url: data.html_url,
        cloneUrl: data.clone_url,
        sshUrl: data.ssh_url,
        createdAt: data.created_at,
        defaultBranch: data.default_branch,
      };
    }

    case GitHubOperation.REPOSITORY_GET: {
      const data = await client.request(`/repos/${owner}/${repo}`);
      return {
        repositoryId: data.id,
        name: data.name,
        fullName: data.full_name,
        owner: data.owner?.login,
        description: data.description,
        url: data.html_url,
        stars: data.stargazers_count,
        forks: data.forks_count,
        watchers: data.watchers_count,
        openIssues: data.open_issues_count,
        language: data.language,
        topics: data.topics,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        pushedAt: data.pushed_at,
        defaultBranch: data.default_branch,
        visibility: data.visibility,
        archived: data.archived,
        fork: data.fork,
        size: data.size,
      };
    }

    case GitHubOperation.REPOSITORY_LIST: {
      const type = config.options?.type || "all";
      const sort = config.options?.sort || "updated";
      const perPage = config.perPage || 30;
      const data = await client.request(
        `/user/repos?type=${type}&sort=${sort}&per_page=${perPage}`
      );
      return {
        repositories: Array.isArray(data) ? data.map((r: any) => ({
          id: r.id, name: r.name, fullName: r.full_name,
          owner: r.owner?.login, description: r.description,
          url: r.html_url, stars: r.stargazers_count,
          forks: r.forks_count, language: r.language,
          updatedAt: r.updated_at, defaultBranch: r.default_branch,
          visibility: r.visibility,
        })) : [],
        totalCount: Array.isArray(data) ? data.length : 0,
      };
    }

    case GitHubOperation.REPOSITORY_UPDATE: {
      const body: Record<string, unknown> = {};
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.options?.name) body.name = config.options.name;
      if (config.options?.private !== undefined) body.private = config.options.private;
      if (config.options?.archived !== undefined) body.archived = config.options.archived;
      if (config.options?.defaultBranch) body.default_branch = config.options.defaultBranch;
      if (config.options?.allowSquashMerge !== undefined) body.allow_squash_merge = config.options.allowSquashMerge;
      if (config.options?.allowMergeCommit !== undefined) body.allow_merge_commit = config.options.allowMergeCommit;
      if (config.options?.allowRebaseMerge !== undefined) body.allow_rebase_merge = config.options.allowRebaseMerge;
      if (config.options?.deleteBranchOnMerge !== undefined) body.delete_branch_on_merge = config.options.deleteBranchOnMerge;
      return client.request(`/repos/${owner}/${repo}`, { method: "PATCH", body });
    }

    case GitHubOperation.REPOSITORY_DELETE: {
      await client.request(`/repos/${owner}/${repo}`, { method: "DELETE" });
      return { success: true, message: `Repository ${owner}/${repo} deleted` };
    }

    case GitHubOperation.REPOSITORY_FORK: {
      const body: Record<string, unknown> = {};
      if (config.options?.organization) body.organization = config.options.organization;
      if (config.options?.name) body.name = config.options.name;
      if (config.options?.defaultBranchOnly !== undefined) body.default_branch_only = config.options.defaultBranchOnly;
      return client.request(`/repos/${owner}/${repo}/forks`, { method: "POST", body });
    }

    case GitHubOperation.REPOSITORY_LIST_CONTRIBUTORS:
      return client.request(`/repos/${owner}/${repo}/contributors?per_page=${config.perPage || 30}`);

    case GitHubOperation.REPOSITORY_LIST_LANGUAGES:
      return client.request(`/repos/${owner}/${repo}/languages`);

    case GitHubOperation.REPOSITORY_TRANSFER: {
      const body: Record<string, unknown> = {
        new_owner: resolveTemplate(config.options?.newOwner || "", context),
      };
      if (config.options?.newName) body.new_name = config.options.newName;
      return client.request(`/repos/${owner}/${repo}/transfer`, { method: "POST", body });
    }

    case GitHubOperation.REPOSITORY_DISPATCH: {
      const event_type = resolveTemplate(config.eventType || "", context);
      const client_payload = config.clientPayload
        ? JSON.parse(resolveTemplate(config.clientPayload, context))
        : {};
      await client.request(`/repos/${owner}/${repo}/dispatches`, {
        method: "POST",
        body: { event_type, client_payload },
      });
      return { success: true, eventType: event_type };
    }

    case GitHubOperation.REPOSITORY_CHECK_COLLABORATOR: {
      const username = resolveTemplate(config.options?.username || "", context);
      try {
        await client.request(`/repos/${owner}/${repo}/collaborators/${username}`);
        return { isCollaborator: true, username };
      } catch {
        return { isCollaborator: false, username };
      }
    }

    case GitHubOperation.REPOSITORY_LIST_EVENTS:
      return client.request(`/repos/${owner}/${repo}/events?per_page=${config.perPage || 30}`);

    // ── File Operations (7) ────────────────────────────────────────
    case GitHubOperation.FILE_GET:
    case GitHubOperation.FILE_GET_CONTENTS: {
      const ref = config.branch ? `?ref=${config.branch}` : "";
      const data = await client.request(
        `/repos/${owner}/${repo}/contents/${config.filePath}${ref}`
      );
      if (data.type === "file" && data.content) {
        data.contentDecoded = Buffer.from(data.content, "base64").toString("utf-8");
      }
      return data;
    }

    case GitHubOperation.FILE_CREATE_OR_UPDATE:
    case GitHubOperation.FILE_CREATE:
    case GitHubOperation.FILE_UPDATE: {
      const content = Buffer.from(
        resolveTemplate(config.fileContent || "", context)
      ).toString("base64");
      const message = resolveTemplate(config.commitMessage || "", context);
      const body: Record<string, unknown> = { message, content };
      if (config.branch) body.branch = config.branch;
      if (config.options?.sha) body.sha = config.options.sha;

      if (config.operation === GitHubOperation.FILE_CREATE_OR_UPDATE && !body.sha) {
        try {
          const existing = await client.request(
            `/repos/${owner}/${repo}/contents/${config.filePath}${config.branch ? `?ref=${config.branch}` : ""}`
          );
          if (existing?.sha) body.sha = existing.sha;
        } catch {
          // File does not exist, proceed to create
        }
      }
      const data = await client.request(
        `/repos/${owner}/${repo}/contents/${config.filePath}`,
        { method: "PUT", body }
      );
      return {
        name: data.content?.name,
        path: data.content?.path,
        sha: data.content?.sha,
        commitSha: data.commit?.sha,
      };
    }

    case GitHubOperation.FILE_DELETE: {
      const body: Record<string, unknown> = {
        message: resolveTemplate(config.commitMessage || "", context),
        sha: config.options?.sha,
      };
      if (config.branch) body.branch = config.branch;
      await client.request(
        `/repos/${owner}/${repo}/contents/${config.filePath}`,
        { method: "DELETE", body }
      );
      return { success: true, path: config.filePath };
    }

    case GitHubOperation.FILE_LIST: {
      const ref = config.branch ? `?ref=${config.branch}` : "";
      const data = await client.request(
        `/repos/${owner}/${repo}/contents/${config.filePath || ""}${ref}`
      );
      return {
        files: Array.isArray(data) ? data.map((f: any) => ({
          name: f.name, path: f.path, sha: f.sha,
          size: f.size, type: f.type, downloadUrl: f.download_url,
        })) : [],
        totalCount: Array.isArray(data) ? data.length : 0,
      };
    }

    // ── Branch Operations (6) ──────────────────────────────────────
    case GitHubOperation.BRANCH_LIST:
      return client.request(`/repos/${owner}/${repo}/branches?per_page=${config.perPage || 30}`);

    case GitHubOperation.BRANCH_GET:
      return client.request(`/repos/${owner}/${repo}/branches/${config.branch}`);

    case GitHubOperation.BRANCH_CREATE: {
      const sha = resolveTemplate(config.options?.sha || "", context);
      return client.request(`/repos/${owner}/${repo}/git/refs`, {
        method: "POST",
        body: { ref: `refs/heads/${config.branch}`, sha },
      });
    }

    case GitHubOperation.BRANCH_DELETE: {
      await client.request(
        `/repos/${owner}/${repo}/git/refs/heads/${config.branch}`,
        { method: "DELETE" }
      );
      return { success: true, branch: config.branch };
    }

    case GitHubOperation.BRANCH_RENAME: {
      return client.request(
        `/repos/${owner}/${repo}/branches/${config.branch}/rename`,
        { method: "POST", body: { new_name: config.options?.newName } }
      );
    }

    case GitHubOperation.BRANCH_SET_PROTECTION: {
      const body: Record<string, unknown> = {
        required_status_checks: config.options?.requiredStatusChecks || null,
        enforce_admins: config.options?.enforceAdmins ?? true,
        required_pull_request_reviews: config.options?.requiredPullRequestReviews || null,
        restrictions: config.options?.restrictions || null,
      };
      return client.request(
        `/repos/${owner}/${repo}/branches/${config.branch}/protection`,
        { method: "PUT", body }
      );
    }

    // ── Release Operations (6) ─────────────────────────────────────
    case GitHubOperation.RELEASE_CREATE: {
      const body: Record<string, unknown> = {
        tag_name: resolveTemplate(config.tagName || "", context),
        name: resolveTemplate(config.releaseName || "", context),
        body: resolveTemplate(config.body || "", context),
        draft: config.draft ?? false,
        prerelease: config.prerelease ?? false,
        generate_release_notes: config.options?.generateReleaseNotes ?? false,
      };
      if (config.options?.targetCommitish) body.target_commitish = config.options.targetCommitish;
      const data = await client.request(`/repos/${owner}/${repo}/releases`, { method: "POST", body });
      return {
        releaseId: data.id, tagName: data.tag_name, name: data.name,
        url: data.html_url, uploadUrl: data.upload_url,
        draft: data.draft, prerelease: data.prerelease, createdAt: data.created_at,
      };
    }

    case GitHubOperation.RELEASE_GET: {
      const releaseId = config.options?.releaseId;
      return client.request(`/repos/${owner}/${repo}/releases/${releaseId}`);
    }

    case GitHubOperation.RELEASE_LIST:
      return client.request(`/repos/${owner}/${repo}/releases?per_page=${config.perPage || 30}`);

    case GitHubOperation.RELEASE_UPDATE: {
      const releaseId = config.options?.releaseId;
      const body: Record<string, unknown> = {};
      if (config.tagName) body.tag_name = resolveTemplate(config.tagName, context);
      if (config.releaseName) body.name = resolveTemplate(config.releaseName, context);
      if (config.body) body.body = resolveTemplate(config.body, context);
      if (config.draft !== undefined) body.draft = config.draft;
      if (config.prerelease !== undefined) body.prerelease = config.prerelease;
      return client.request(`/repos/${owner}/${repo}/releases/${releaseId}`, { method: "PATCH", body });
    }

    case GitHubOperation.RELEASE_DELETE: {
      const releaseId = config.options?.releaseId;
      await client.request(`/repos/${owner}/${repo}/releases/${releaseId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.RELEASE_UPLOAD_ASSET: {
      // Upload asset requires special handling — typically done via the upload_url from a release
      throw new NonRetriableError("RELEASE_UPLOAD_ASSET requires binary upload. Use the upload_url from RELEASE_CREATE/GET.");
    }

    // ── Gist Operations (6) ────────────────────────────────────────
    case GitHubOperation.GIST_CREATE: {
      const files = config.options?.files
        ? (typeof config.options.files === "string" ? JSON.parse(config.options.files) : config.options.files)
        : {};
      return client.request("/gists", {
        method: "POST",
        body: {
          description: resolveTemplate(config.body || "", context),
          files,
          public: config.options?.public ?? true,
        },
      });
    }

    case GitHubOperation.GIST_GET:
      return client.request(`/gists/${config.options?.gistId}`);

    case GitHubOperation.GIST_LIST: {
      const username = config.options?.username;
      const endpoint = username ? `/users/${username}/gists` : "/gists";
      return client.request(`${endpoint}?per_page=${config.perPage || 30}`);
    }

    case GitHubOperation.GIST_UPDATE: {
      const body: Record<string, unknown> = {};
      if (config.body) body.description = resolveTemplate(config.body, context);
      if (config.options?.files) {
        body.files = typeof config.options.files === "string"
          ? JSON.parse(config.options.files) : config.options.files;
      }
      return client.request(`/gists/${config.options?.gistId}`, { method: "PATCH", body });
    }

    case GitHubOperation.GIST_DELETE: {
      await client.request(`/gists/${config.options?.gistId}`, { method: "DELETE" });
      return { success: true };
    }

    case GitHubOperation.GIST_STAR: {
      await client.request(`/gists/${config.options?.gistId}/star`, { method: "PUT" });
      return { success: true, starred: true };
    }

    default:
      throw new NonRetriableError(
        `Unsupported repository/file/branch/release/gist operation: ${config.operation}`
      );
  }
}
