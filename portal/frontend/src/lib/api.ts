// Minimal fetch wrapper for the portal backend. Owner: Kelsey (frontend).
const API_BASE =
  process.env.NEXT_PUBLIC_PORTAL_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  search: (query: Record<string, unknown>) =>
    req<Record<string, any>>("/api/portal/search", {
      method: "POST",
      body: JSON.stringify(query),
    }),
  listNodes: () => req<{ node_id: string; base_url: string }[]>("/api/portal/nodes"),
  createAccessRequest: (payload: Record<string, unknown>) =>
    req<Record<string, any>>("/api/portal/access-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listNodeRequests: (nodeId: string) =>
    req<Record<string, any>[]>(`/api/portal/nodes/${nodeId}/requests`),
  decide: (nodeId: string, requestId: string, decision: "approved" | "rejected") =>
    req<Record<string, any>>(
      `/api/portal/nodes/${nodeId}/requests/${requestId}/decision`,
      { method: "POST", body: JSON.stringify({ decision }) }
    ),
};
