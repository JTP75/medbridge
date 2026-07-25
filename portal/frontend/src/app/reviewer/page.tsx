"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function ReviewerPage() {
  const [nodeId, setNodeId] = useState("BCH");
  const [requests, setRequests] = useState<any[]>([]);

  async function loadQueue() {
    setRequests(await api.listNodeRequests(nodeId));
  }

  async function decide(requestId: string, decision: "approved" | "rejected") {
    await api.decide(nodeId, requestId, decision);
    await loadQueue();
  }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h1>Hospital Reviewer (boilerplate)</h1>
      <label>
        Node:{" "}
        <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
          <option value="BCH">BCH</option>
          <option value="MGH">MGH</option>
          <option value="BWH">BWH</option>
        </select>
      </label>
      <button onClick={loadQueue} style={{ marginLeft: 8 }}>
        Load queue
      </button>

      <ul>
        {requests.map((r) => (
          <li key={r.request_id} style={{ marginBottom: 12 }}>
            <div>
              {r.organization_name} ({r.requester_tier}) — {r.status}
            </div>
            <button onClick={() => decide(r.request_id, "approved")}>Approve</button>
            <button onClick={() => decide(r.request_id, "rejected")} style={{ marginLeft: 8 }}>
              Reject
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
