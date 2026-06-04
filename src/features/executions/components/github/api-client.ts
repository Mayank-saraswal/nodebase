import { NonRetriableError } from "inngest";

interface GitHubClientOptions {
  accessToken: string;
  baseUrl?: string;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class GitHubClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: GitHubClientOptions) {
    this.baseUrl = options.baseUrl || "https://api.github.com";
    this.headers = {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
    };
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: { ...this.headers, ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Handle rate limiting
    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        const resetTime = response.headers.get("x-ratelimit-reset");
        throw new NonRetriableError(
          `GitHub API rate limit exceeded. Resets at ${resetTime}`
        );
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new NonRetriableError(
        this.getErrorMessage(response.status, error)
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }
    
    // For raw contents (like file downloads)
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("application/json")) {
        return response.text() as any;
    }

    return response.json();
  }

  private getErrorMessage(status: number, error: any): string {
    const message = error.message || error.error || "Unknown error";
    const hints: Record<string, string> = {
      "Not Found": "Repository or resource not found. Check owner/repo.",
      "Bad credentials": "Invalid GitHub token. Check your credential.",
      "Repository creation failed": "Failed to create repository.",
      "Reference already exists": "Branch or tag already exists.",
    };
    if (error.errors && Array.isArray(error.errors)) {
      hints["Validation Failed"] = `Validation error: ${JSON.stringify(error.errors)}`;
    }
    return hints[message] || `GitHub API error (${status}): ${message}`;
  }

  // Pagination helper
  async *paginate<T = any>(
    endpoint: string,
    perPage: number = 30
  ): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    while (true) {
      const separator = endpoint.includes("?") ? "&" : "?";
      const url = `${endpoint}${separator}per_page=${perPage}&page=${page}`;
      const response = await fetch(`${this.baseUrl}${url}`, {
        headers: this.headers,
      });
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;
      
      yield data;
      
      // Check Link header for next page
      const linkHeader = response.headers.get("link");
      if (!linkHeader?.includes('rel="next"')) break;
      
      page++;
    }
  }
}
