"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AccessRequest } from "@medbridge/schema";
import { api } from "@/lib/api";

type Role = "researcher" | "hospital";
type Screen = "login" | "researcher-dashboard" | "hospital-dashboard";

type Hospital = {
  node_id: string;
  name: string;
  studies: number;
  specialty: string;
  status: "online" | "syncing";
};

type NodeResponse = {
  node_id: string;
  match: {
    count: number | null;
    display_count: string | null;
    suppressed: boolean;
  };
  access_request_supported: boolean;
};

type AggregatedResult = {
  total_count: number | null;
  any_suppressed: boolean;
  node_responses: NodeResponse[];
  node_errors: { node_id: string; error: string }[];
  message: string | null;
  query_id?: string;
};

type DataMode = "live" | "preview";

const FALLBACK_HOSPITALS: Hospital[] = [
  {
    node_id: "BCH",
    name: "Boston Children’s Hospital",
    studies: 900,
    specialty: "Pediatric imaging",
    status: "online",
  },
  {
    node_id: "MGH",
    name: "Massachusetts General Hospital",
    studies: 900,
    specialty: "Adult diagnostic imaging",
    status: "online",
  },
  {
    node_id: "BWH",
    name: "Brigham and Women’s Hospital",
    studies: 900,
    specialty: "Women’s health & imaging",
    status: "online",
  },
];

const PREVIEW_SEARCH_RESULT: AggregatedResult = {
  total_count: null,
  any_suppressed: true,
  node_responses: [
    {
      node_id: "BCH",
      match: { count: 47, display_count: "47", suppressed: false },
      access_request_supported: true,
    },
    {
      node_id: "MGH",
      match: { count: null, display_count: "<10", suppressed: true },
      access_request_supported: true,
    },
    {
      node_id: "BWH",
      match: { count: 23, display_count: "23", suppressed: false },
      access_request_supported: true,
    },
  ],
  node_errors: [],
  message: "Additional matches exist at one or more participating hospitals.",
};

const PREVIEW_ACCESS_REQUESTS: AccessRequest[] = [
  {
    request_id: "REQ-2048",
    status: "pending_hospital_review",
    requester_name: "Dr. Amelia Jorgenson",
    organization_name: "Northeastern University",
    requester_tier: "edu_research",
    contact_email: "amelia@northeastern.edu",
    research_purpose: "Pediatric neuro-oncology cohort feasibility study",
    query_summary: "Pediatric · BRAIN · MR · neoplasm",
    requested_node_id: "BCH",
    requested_data_level: "deidentified",
  },
  {
    request_id: "REQ-2047",
    status: "pending_hospital_review",
    requester_name: "Marco Li",
    organization_name: "NeuroVista Labs",
    requester_tier: "business_commercial",
    contact_email: "marco@neurovista.example",
    research_purpose: "Commercial imaging model feasibility assessment",
    query_summary: "Adult · BRAIN · CT · ischemia",
    requested_node_id: "BCH",
    requested_data_level: "deidentified",
  },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [role, setRole] = useState<Role>("researcher");
  const [hospitals, setHospitals] = useState(FALLBACK_HOSPITALS);
  const [hospitalId, setHospitalId] = useState("BCH");
  const [organization, setOrganization] = useState("Northeastern University");
  const [requesterTier, setRequesterTier] =
    useState<AccessRequest["requester_tier"]>("edu_research");
  const [query, setQuery] = useState("pediatric brain MRI with tumors");
  const [searched, setSearched] = useState(true);
  const [searchResult, setSearchResult] =
    useState<AggregatedResult>(PREVIEW_SEARCH_RESULT);
  const [searchMode, setSearchMode] = useState<DataMode>("preview");
  const [nodesMode, setNodesMode] = useState<DataMode>("preview");

  useEffect(() => {
    api
      .listNodes()
      .then((nodes) => {
        if (!nodes.length) return;
        setHospitals(
          nodes.map((node) => {
            const known = FALLBACK_HOSPITALS.find(
              (item) => item.node_id === node.node_id,
            );
            return (
              known ?? {
                node_id: node.node_id,
                name: node.node_id,
                studies: 0,
                specialty: "Participating imaging node",
                status: "online" as const,
              }
            );
          }),
        );
        setHospitalId(nodes[0].node_id);
        setNodesMode("live");
      })
      .catch(() => {
        // The hospital list is mocked until Agnel's node service is available.
      });
  }, []);

  const selectedHospital = useMemo(
    () =>
      hospitals.find((hospital) => hospital.node_id === hospitalId) ??
      hospitals[0],
    [hospitalId, hospitals],
  );

  function signIn(event: FormEvent) {
    event.preventDefault();
    setScreen(role === "researcher" ? "researcher-dashboard" : "hospital-dashboard");
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setSearched(false);
    const normalized = query.toLowerCase();
    const payload = {
      query_id: crypto.randomUUID(),
      ...(normalized.includes("mri") || normalized.includes(" mr")
        ? { modality: "MR" }
        : {}),
      ...(normalized.includes("brain") ? { body_part: "BRAIN" } : {}),
      ...(normalized.includes("pediatric") ? { age_band: "pediatric" } : {}),
      ...(normalized.includes("tumor") || normalized.includes("neoplasm")
        ? { condition_category: "neoplasm" }
        : {}),
    };
    try {
      const result = (await api.search(payload)) as AggregatedResult;
      setSearchResult(result);
      setSearchMode("live");
    } catch {
      setSearchResult(PREVIEW_SEARCH_RESULT);
      setSearchMode("preview");
    } finally {
      setSearched(true);
    }
  }

  if (screen === "login") {
    return (
      <main className="auth-shell">
        <section className="auth-story">
          <Brand light />
          <div className="story-content">
            <p className="eyebrow light-text">Federated medical imaging discovery</p>
            <h1>Discover evidence.<br />Keep patient data local.</h1>
            <p>
              MedBridge connects researchers with privacy-safe cohort counts
              across hospital nodes—without centralizing patient records.
            </p>
            <div className="network-preview" aria-label="MedBridge network preview">
              <div className="network-node researcher-node">Researcher</div>
              <div className="network-line" />
              <div className="network-core">MB</div>
              <div className="network-line" />
              <div className="hospital-stack">
                <span>BCH</span><span>MGH</span><span>BWH</span>
              </div>
            </div>
          </div>
          <p className="privacy-footnote">
            Raw records, identifiers, and clinical reports remain inside each hospital.
          </p>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <p className="eyebrow">Welcome to MedBridge</p>
            <h2>Choose your portal</h2>
            <p className="muted">Your role determines the workspace you’ll enter.</p>

            <div className="role-grid">
              <button
                className={`role-card ${role === "researcher" ? "selected" : ""}`}
                onClick={() => setRole("researcher")}
                type="button"
              >
                <span className="role-icon">R</span>
                <strong>Researcher</strong>
                <small>Discover cohorts and request access</small>
                <span className="radio" />
              </button>
              <button
                className={`role-card ${role === "hospital" ? "selected hospital" : ""}`}
                onClick={() => setRole("hospital")}
                type="button"
              >
                <span className="role-icon hospital-icon">H</span>
                <strong>Hospital organization</strong>
                <small>Manage your node and review requests</small>
                <span className="radio" />
              </button>
            </div>

            <form className="login-form" onSubmit={signIn}>
              {role === "hospital" ? (
                <label>
                  Hospital organization
                  <select
                    value={hospitalId}
                    onChange={(event) => setHospitalId(event.target.value)}
                  >
                    {hospitals.map((hospital) => (
                      <option key={hospital.node_id} value={hospital.node_id}>
                        {hospital.name} ({hospital.node_id})
                      </option>
                    ))}
                  </select>
                  <span className="field-note">
                    {hospitals.length} participating hospital nodes available
                  </span>
                </label>
              ) : (
                <>
                  <label>
                    Requester tier
                    <select
                      value={requesterTier}
                      onChange={(event) =>
                        setRequesterTier(
                          event.target.value as AccessRequest["requester_tier"],
                        )
                      }
                    >
                      <option value="edu_research">Education / Research</option>
                      <option value="business_commercial">Business / Commercial</option>
                    </select>
                  </label>
                  <label>
                    Organization name
                    <input
                      value={organization}
                      onChange={(event) => setOrganization(event.target.value)}
                      placeholder="e.g. Northeastern University"
                      required
                    />
                  </label>
                </>
              )}
              <label>
                Work email
                <input type="email" placeholder="name@organization.org" required />
              </label>
              <label>
                Password
                <input type="password" placeholder="Enter your password" required />
              </label>
              <button className="primary-button" type="submit">
                Continue as {role === "researcher" ? "Researcher" : selectedHospital?.node_id}
                <span>→</span>
              </button>
            </form>
            <p className="demo-note">Demo authorization · No production identity verification</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className={`app-shell ${screen === "hospital-dashboard" ? "hospital-app" : ""}`}>
      <Sidebar
        role={screen === "researcher-dashboard" ? "researcher" : "hospital"}
        hospital={selectedHospital}
        requesterTier={requesterTier}
        onLogout={() => setScreen("login")}
      />
      {screen === "researcher-dashboard" ? (
        <ResearcherDashboard
          query={query}
          setQuery={setQuery}
          searched={searched}
          runSearch={runSearch}
          result={searchResult}
          dataMode={searchMode}
          organization={organization}
          requesterTier={requesterTier}
        />
      ) : (
        <HospitalDashboard hospital={selectedHospital} nodesMode={nodesMode} />
      )}
    </div>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">M</span>
      <span><strong>MedBridge</strong><small>Imaging Network</small></span>
    </div>
  );
}

function Sidebar({
  role,
  hospital,
  requesterTier,
  onLogout,
}: {
  role: Role;
  hospital?: Hospital;
  requesterTier: AccessRequest["requester_tier"];
  onLogout: () => void;
}) {
  const researcherNav = ["Discover Cohorts", "Saved Cohorts", "Access Requests", "Approved Data", "My Activity"];
  const hospitalNav = ["Node Overview", "Access Requests", "Cohort Activity", "Data Policy", "Audit Trail"];
  return (
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">
        <span>{role === "researcher" ? "R" : hospital?.node_id.slice(0, 1)}</span>
        <div>
          <strong>{role === "researcher" ? "Research Workspace" : hospital?.node_id + " Node"}</strong>
          <small>
            {role === "researcher"
              ? requesterTier === "edu_research"
                ? "Education / Research"
                : "Business / Commercial"
              : hospital?.name}
          </small>
        </div>
      </div>
      <nav>
        {(role === "researcher" ? researcherNav : hospitalNav).map((item, index) => (
          <button className={index === 0 ? "active" : ""} key={item}>
            <span className="nav-symbol">{["⌕", "◇", "□", "↓", "↻"][index]}</span>{item}
            {item === "Access Requests" && <em>{role === "hospital" ? "2" : "1"}</em>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-chip">● Privacy boundary active</div>
        <button onClick={onLogout}>← Switch portal</button>
      </div>
    </aside>
  );
}

function ResearcherDashboard({
  query,
  setQuery,
  searched,
  runSearch,
  result,
  dataMode,
  organization,
  requesterTier,
}: {
  query: string;
  setQuery: (value: string) => void;
  searched: boolean;
  runSearch: (event: FormEvent) => void;
  result: AggregatedResult;
  dataMode: DataMode;
  organization: string;
  requesterTier: AccessRequest["requester_tier"];
}) {
  const [requestNode, setRequestNode] = useState(
    result.node_responses[0]?.node_id ?? "BCH",
  );
  const [requestStatus, setRequestStatus] = useState<
    "idle" | "sending" | "sent" | "preview"
  >("idle");

  const confirmedCount = result.node_responses.reduce(
    (total, node) => total + (node.match.count ?? 0),
    0,
  );

  async function requestAccess() {
    setRequestStatus("sending");
    try {
      await api.createAccessRequest({
        requester_name: "Demo Requester",
        organization_name: organization,
        requester_tier: requesterTier,
        contact_email: "demo@medbridge.example",
        research_purpose: "Cohort feasibility and approved research analysis",
        query_summary: query,
        requested_node_id: requestNode,
        requested_data_level: "deidentified",
      });
      setRequestStatus("sent");
    } catch {
      setRequestStatus("preview");
    }
  }

  return (
    <main className="dashboard">
      <Topbar label="Researcher Portal" identity="Dr. Amelia Jorgenson" />
      <div className="dashboard-content">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Federated cohort discovery</p>
            <h1>Find imaging data across hospitals</h1>
            <p>Search privacy-safe study counts before requesting hospital approval.</p>
          </div>
          <span className="tier-badge">
            {requesterTier === "edu_research"
              ? "Education / Research"
              : "Business / Commercial"}
          </span>
        </header>

        <form className="search-panel" onSubmit={runSearch}>
          <div className="search-row">
            <span className="search-icon">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Natural language cohort search"
            />
            <button type="submit">Search network</button>
          </div>
          <div className="filter-row">
            <button type="button">Modality: MR</button>
            <button type="button">Body part: Brain</button>
            <button type="button">Age: Pediatric</button>
            <button type="button">Condition: Neoplasm</button>
            <span>3 hospitals selected</span>
          </div>
        </form>

        {!searched ? (
          <div className="loading-state">Querying hospital nodes…</div>
        ) : (
          <>
            {dataMode === "preview" && (
              <div className="integration-banner">
                Preview data shown · Justin’s Portal API is wired; live counts will
                replace this automatically when Agnel’s hospital data is available.
              </div>
            )}
            <div className="discovery-grid">
            <section className="results-column">
              <div className="result-summary">
                <div>
                  <p className="eyebrow">Privacy-safe result</p>
                  <h2>
                    {result.total_count ?? confirmedCount}
                    {result.any_suppressed ? "+" : ""} confirmed matching studies
                  </h2>
                  <p>
                    {result.message ??
                      "All responding hospital nodes returned safe exact counts."}
                  </p>
                </div>
                <span className="safe-badge">Privacy protected</span>
              </div>
              <div className="node-results">
                {result.node_responses.map((node) => (
                  <article
                    key={node.node_id}
                    className={`node-result ${
                      node.match.suppressed ? "suppressed" : "available"
                    }`}
                  >
                    <div className="node-avatar">{node.node_id.slice(0, 1)}</div>
                    <div>
                      <strong>{node.node_id} Hospital Node</strong>
                      <small>
                        {node.match.suppressed
                          ? "Small cohort protection applied"
                          : "Response received"}
                      </small>
                    </div>
                    <div className="node-count">
                      <strong>
                        {node.match.display_count ?? node.match.count ?? "—"}
                      </strong>
                      <small>
                        {node.match.suppressed
                          ? "privacy protected"
                          : "matching studies"}
                      </small>
                    </div>
                  </article>
                ))}
                {result.node_errors.map((node) => (
                  <article className="node-result node-error" key={node.node_id}>
                    <div className="node-avatar">{node.node_id.slice(0, 1)}</div>
                    <div>
                      <strong>{node.node_id} Hospital Node</strong>
                      <small>Temporarily unavailable</small>
                    </div>
                    <div className="node-count"><strong>—</strong><small>no response</small></div>
                  </article>
                ))}
              </div>
              <div className="privacy-callout">
                <strong>Patient data never left the hospitals.</strong>
                <span>Only aggregated counts and approved metadata are shown here.</span>
              </div>
            </section>

            <aside className="interpretation-card">
              <p className="eyebrow">Query interpretation</p>
              <h3>How MedBridge read your search</h3>
              <div className="query-quote">“{query}”</div>
              <dl>
                <div><dt>Age band</dt><dd>Pediatric</dd></div>
                <div><dt>Body part</dt><dd>BRAIN</dd></div>
                <div><dt>Modality</dt><dd>MR</dd></div>
                <div><dt>Condition</dt><dd>NEOPLASM</dd></div>
              </dl>
              <div className="semantic-path">
                <span>Tumor</span><b>→</b><span>Neoplasm</span>
              </div>
              <label className="request-node-select">
                Request access from
                <select
                  value={requestNode}
                  onChange={(event) => setRequestNode(event.target.value)}
                >
                  {result.node_responses
                    .filter((node) => node.access_request_supported)
                    .map((node) => (
                      <option value={node.node_id} key={node.node_id}>
                        {node.node_id} Hospital Node
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="primary-button"
                onClick={requestAccess}
                disabled={requestStatus === "sending"}
              >
                {requestStatus === "sending"
                  ? "Submitting…"
                  : requestStatus === "sent"
                    ? "Request submitted ✓"
                    : requestStatus === "preview"
                      ? "Preview request created"
                      : "Request de-identified data"}
              </button>
            </aside>
          </div>
          </>
        )}
      </div>
    </main>
  );
}

function HospitalDashboard({
  hospital,
  nodesMode,
}: {
  hospital?: Hospital;
  nodesMode: DataMode;
}) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [queueMode, setQueueMode] = useState<DataMode>("preview");

  useEffect(() => {
    if (!hospital) return;
    api
      .listNodeRequests(hospital.node_id)
      .then((items) => {
        setRequests(items as AccessRequest[]);
        setQueueMode("live");
      })
      .catch(() => {
        setRequests(
          PREVIEW_ACCESS_REQUESTS.map((request) => ({
            ...request,
            requested_node_id: hospital.node_id,
          })),
        );
        setQueueMode("preview");
      });
  }, [hospital]);

  async function decide(
    requestId: string | undefined,
    decision: "approved" | "rejected",
  ) {
    if (!hospital || !requestId) return;
    try {
      const updated = (await api.decide(
        hospital.node_id,
        requestId,
        decision,
      )) as AccessRequest;
      setRequests((current) =>
        current.map((request) =>
          request.request_id === requestId ? updated : request,
        ),
      );
      setQueueMode("live");
    } catch {
      setRequests((current) =>
        current.map((request) =>
          request.request_id === requestId
            ? { ...request, status: decision }
            : request,
        ),
      );
      setQueueMode("preview");
    }
  }

  return (
    <main className="dashboard">
      <Topbar label="Hospital Organization Portal" identity={`${hospital?.node_id} Reviewer`} />
      <div className="dashboard-content">
        <header className="page-heading hospital-heading">
          <div>
            <p className="eyebrow">Hospital-controlled workspace</p>
            <h1>{hospital?.name}</h1>
            <p>Monitor your local beacon and decide access requests owned by your organization.</p>
          </div>
          <span className="node-online">● Node online</span>
        </header>

        <section className="stat-grid">
          <Stat
            label="Local studies"
            value={nodesMode === "live" && hospital?.studies === 0 ? "Pending" : hospital?.studies.toLocaleString() ?? "—"}
            note="Remain inside this node"
          />
          <Stat label="Search endpoint" value="Active" note="Privacy-filtered responses" />
          <Stat
            label="Pending requests"
            value={requests
              .filter((request) => request.status === "pending_hospital_review")
              .length.toString()}
            note="Awaiting hospital review"
          />
          <Stat label="Maximum access" value="De-ID" note="Hospital-controlled" />
        </section>

        <div className="hospital-grid">
          <section className="request-panel">
            {queueMode === "preview" && (
              <div className="integration-banner compact">
                Preview queue · Connected to Justin’s reviewer API; waiting for
                running hospital nodes.
              </div>
            )}
            <div className="section-title">
              <div><p className="eyebrow">Hospital authority</p><h2>Access requests</h2></div>
              <button>View all</button>
            </div>
            {requests.map((request) => (
              <article className="request-card" key={request.request_id}>
                <div className="request-id">{request.request_id}</div>
                <div className="request-main">
                  <strong>{request.requester_name}</strong>
                  <span>
                    {request.organization_name} ·{" "}
                    {request.requester_tier === "edu_research"
                      ? "Education / Research"
                      : "Business / Commercial"}
                  </span>
                  <p>{request.query_summary}</p>
                </div>
                <div className="request-actions">
                  <small>{request.status?.replaceAll("_", " ")}</small>
                  {request.status === "pending_hospital_review" ? (
                    <div>
                      <button
                        onClick={() => decide(request.request_id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="reject-button"
                        onClick={() => decide(request.request_id, "rejected")}
                      >
                        Deny
                      </button>
                    </div>
                  ) : (
                    <strong>{request.status}</strong>
                  )}
                </div>
              </article>
            ))}
            {!requests.length && (
              <div className="empty-queue">No access requests for this hospital node.</div>
            )}
          </section>

          <aside className="node-policy-card">
            <p className="eyebrow">Local disclosure policy</p>
            <h3>Privacy boundary</h3>
            <div className="policy-meter"><span /></div>
            <dl>
              <div><dt>Small-cohort threshold</dt><dd>&lt;10</dd></div>
              <div><dt>Maximum data level</dt><dd>De-identified</dd></div>
              <div><dt>Raw record exposure</dt><dd>Blocked</dd></div>
              <div><dt>Access decisions</dt><dd>Hospital-owned</dd></div>
            </dl>
            <p className="policy-note">Discovery never grants data access. Every request requires an independent hospital decision.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Topbar({ label, identity }: { label: string; identity: string }) {
  return (
    <header className="topbar">
      <span>{label}</span>
      <div className="topbar-user"><span>Demo authorization</span><strong>{identity}</strong><b>{identity.slice(0, 1)}</b></div>
    </header>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="stat-card"><small>{label}</small><strong>{value}</strong><span>{note}</span></article>;
}
