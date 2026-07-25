"use client";

import { useState } from "react";
import type { AccessRequest } from "@medbridge/schema";
import { api } from "@/lib/api";

export default function SearchPage() {
  const [conditionCategory, setConditionCategory] = useState("");
  const [result, setResult] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [tier, setTier] = useState<AccessRequest["requester_tier"]>("edu_research");
  const [nodeId, setNodeId] = useState("BCH");
  const [requestStatus, setRequestStatus] = useState<any>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.search({
      query_id: crypto.randomUUID(),
      ...(conditionCategory ? { condition_category: conditionCategory } : {}),
    });
    setResult(r);
  }

  async function onRequestAccess(e: React.FormEvent) {
    e.preventDefault();
    const r = await api.createAccessRequest({
      requester_name: "Demo Requester",
      organization_name: orgName,
      requester_tier: tier,
      contact_email: "demo@example.org",
      research_purpose: "Hackathon demo request.",
      query_summary: `condition_category=${conditionCategory || "any"}`,
      requested_node_id: nodeId,
      requested_data_level: "deidentified",
    });
    setRequestStatus(r);
  }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h1>MedBridge Search (boilerplate)</h1>

      <form onSubmit={onSearch} style={{ marginBottom: 24 }}>
        <label>
          Condition category:{" "}
          <input
            value={conditionCategory}
            onChange={(e) => setConditionCategory(e.target.value)}
            placeholder="e.g. neoplasm"
          />
        </label>
        <button type="submit" style={{ marginLeft: 8 }}>
          Search
        </button>
      </form>

      {result && (
        <pre style={{ background: "#f2f2f2", padding: 12 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <h2>Request access</h2>
      <form onSubmit={onRequestAccess}>
        <div>
          <label>
            Node:{" "}
            <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              <option value="BCH">BCH</option>
              <option value="MGH">MGH</option>
              <option value="BWH">BWH</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Tier:{" "}
            <select
              value={tier}
              onChange={(e) =>
                setTier(e.target.value as AccessRequest["requester_tier"])
              }
            >
              <option value="edu_research">edu_research</option>
              <option value="business_commercial">business_commercial</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Organization name:{" "}
            <input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </label>
        </div>
        <button type="submit" style={{ marginTop: 8 }}>
          Request Access
        </button>
      </form>

      {requestStatus && (
        <pre style={{ background: "#f2f2f2", padding: 12 }}>
          {JSON.stringify(requestStatus, null, 2)}
        </pre>
      )}
    </div>
  );
}
