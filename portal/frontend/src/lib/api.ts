import type {
  AccessRequest,
  DiscoveryQuery,
  SearchResponse,
} from "@medbridge/schema";

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
  search: (query: DiscoveryQuery) =>
    req<{
      query_id: string;
      total_count: number | null;
      any_suppressed: boolean;
      node_responses: SearchResponse[];
      node_errors: { node_id: string; error: string }[];
      message: string | null;
    }>("/api/portal/search", {
      method: "POST",
      body: JSON.stringify(query),
    }),
  listNodes: () =>
    req<
      {
        node_id: string;
        base_url: string;
        record_count: number | null;
        access_request_supported: boolean;
        status: "online" | "unavailable";
      }[]
    >("/api/portal/nodes"),
  createAccessRequest: (payload: AccessRequest) =>
    req<AccessRequest>("/api/portal/access-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAccessRequest: (nodeId: string, requestId: string) =>
    req<AccessRequest>(`/api/portal/access-requests/${nodeId}/${requestId}`),
  listNodeRequests: (nodeId: string) =>
    req<AccessRequest[]>(`/api/portal/nodes/${nodeId}/requests`),
  decide: (nodeId: string, requestId: string, decision: "approved" | "rejected") =>
    req<AccessRequest>(
      `/api/portal/nodes/${nodeId}/requests/${requestId}/decision`,
      { method: "POST", body: JSON.stringify({ decision }) }
    ),
};
