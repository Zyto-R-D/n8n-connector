export interface N8nOptions {
  baseUrl: string; // e.g. https://n8n.yourdomain.com
  apiKey: string;
}

export class N8n {
  constructor(private opts: N8nOptions) {}

  async trigger(workflowId: string, payload: unknown) {
    const res = await fetch(`${this.opts.baseUrl}/webhook/${workflowId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": this.opts.apiKey
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`n8n trigger failed: ${res.status}`);
    return res.json();
  }
}
