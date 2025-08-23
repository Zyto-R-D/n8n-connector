export interface N8nOptions {
  baseUrl: string; // e.g. https://n8n.yourdomain.com
  apiKey: string;
}

export class N8n {
  constructor(private opts: N8nOptions) {}

  async trigger(workflowId: string, payload: unknown) {
