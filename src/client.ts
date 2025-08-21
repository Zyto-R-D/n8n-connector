import { fetch } from "undici";

export type N8nClientOptions = {
  /** Base URL of your n8n instance, e.g., https://n8n.example.com */
  baseUrl: string;
  /** API key from n8n (User Menu → Settings → API) */
  apiKey: string;
  /** Optional: override default request timeout (ms) */
  timeoutMs?: number;
};

export type N8nRunResponse = {
  /** n8n returns the execution details; shape can vary by version */
  data?: unknown;
  /** Raw response for debugging */
  raw?: {
    status: number;
    body: unknown;
  };
};

export class N8nClient {
  private base: string;
  private key: string;
  private timeout: number;

  constructor(opts: N8nClientOptions) {
    if (!opts.baseUrl) throw new Error("N8nClient: baseUrl is required");
    if (!opts.apiKey) throw new Error("N8nClient: apiKey is required");
    this.base = opts.baseUrl.replace(/\/+$/, "");
    this.key = opts.apiKey;
    this.timeout = opts.timeoutMs ?? 30_000;
  }

  /**
   * Trigger a workflow by ID with an arbitrary payload.
   * For public API: POST /api/v1/workflows/:id/run
   */
  async run(workflowId: string, payload: unknown): Promise<N8nRunResponse> {
    if (!workflowId) throw new Error("N8nClient.run: workflowId is required");
    const url = `${this.base}/api/v1/workflows/${encodeURIComponent(workflowId)}/run`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.key,
      },
      body: JSON.stringify({ payload }),
      // @ts-ignore undici RequestInit doesn't include timeout; supported via dispatch
    });

    const status = res.status;
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }

    if (status >= 400) {
      const message =
        (typeof body === "object" && body && "message" in body
          ? (body as any).message
          : undefined) ||
        (typeof body === "string" ? body.slice(0, 500) : undefined) ||
        `n8n error ${status}`;
      if (status === 401 || status === 403) {
        throw new N8nAuthError(message, status, body);
      }
      if (status === 404) {
        throw new N8nNotFoundError(message, status, body);
      }
      if (status === 429) {
        throw new N8nRateLimitError(message, status, body);
      }
      throw new N8nHttpError(message, status, body);
    }

    return { data: body, raw: { status, body } };
  }
}

/** Error classes for nicer handling upstream */
export class N8nHttpError extends Error {
  status: number;
  detail: unknown;
  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "N8nHttpError";
    this.status = status;
    this.detail = detail;
  }
}
export class N8nAuthError extends N8nHttpError {
  constructor(message: string, status = 401, detail?: unknown) {
    super(message, status, detail);
    this.name = "N8nAuthError";
  }
}
export class N8nNotFoundError extends N8nHttpError {
  constructor(message: string, status = 404, detail?: unknown) {
    super(message, status, detail);
    this.name = "N8nNotFoundError";
  }
}
export class N8nRateLimitError extends N8nHttpError {
  constructor(message: string, status = 429, detail?: unknown) {
    super(message, status, detail);
    this.name = "N8nRateLimitError";
  }
}
