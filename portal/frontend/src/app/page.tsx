"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AccessRequest, DiscoveryQuery } from "@medbridge/schema";
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
type Modality = NonNullable<DiscoveryQuery["modality"]>;
type BodyPart = NonNullable<DiscoveryQuery["body_part"]>;
type AgeBand = NonNullable<DiscoveryQuery["age_band"]>;
type Condition = NonNullable<DiscoveryQuery["condition_category"]>;

function interpretQuery(text: string) {
  const value = text.toLowerCase();
  const pick = <T extends string>(entries: [RegExp, T][]) =>
    entries.find(([pattern]) => pattern.test(value))?.[1];

  const modality = pick<Modality>([
    [/\b(mri|mr)\b/, "MR"], [/\bct\b/, "CT"], [/\b(ultrasound|us)\b/, "US"],
    [/\b(x[- ]?ray|xr)\b/, "XR"], [/\b(pet|pt)\b/, "PT"], [/\bmammogr/, "MG"],
  ]);
  const bodyPart = pick<BodyPart>([
    [/\b(brain|cranial|neuro)\b/, "BRAIN"], [/\b(heart|cardiac)\b/, "HEART"],
    [/\b(fetal|foetal)\b/, "FETAL"], [/\b(chest|lung)\b/, "CHEST"],
    [/\b(abdomen|abdominal)\b/, "ABDOMEN"], [/\b(spine|spinal)\b/, "SPINE"],
  ]);
  const ageBand = pick<AgeBand>([
    [/\b(0\s*[-–]\s*1|newborn|infant)\b/, "0-1"],
    [/\b(2\s*[-–]\s*5|toddler)\b/, "2-5"],
    [/\b(6\s*[-–]\s*12)\b/, "6-12"],
    [/\b(13\s*[-–]\s*21|adolescent|teen)\b/, "13-21"],
    [/\b(22\s*[-–]\s*40)\b/, "22-40"], [/\b(41\s*[-–]\s*64)\b/, "41-64"],
    [/\b(65\s*[-–]\s*89|senior)\b/, "65-89"], [/\b(90\+|90 plus)\b/, "90+"],
  ]);
  const condition = pick<Condition>([
    [/\b(tumou?r|neoplasm|glioma|astrocytoma|mass)\b/, "neoplasm"],
    [/\b(stroke|ischemi\w*|infarct)\b/, "ischemia"],
    [/\b(bleed|hemorrhag\w*|haemorrhag\w*|hematoma)\b/, "hemorrhage"],
    [/\b(congenital|hydrocephalus|encephalocele|spina bifida)\b/, "congenital_anomaly"],
    [/\b(inflamm\w*|encephalitis|myocarditis|demyelin\w*)\b/, "inflammatory"],
    [/\b(degenerat\w*|atrophy|gliosis)\b/, "degenerative"],
    [/\b(normal|unremarkable)\b/, "normal"],
  ]);

  return { modality, bodyPart, ageBand, condition };
}

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
  const [activePage, setActivePage] = useState("Dashboard");
  const [role, setRole] = useState<Role>("researcher");
  const [hospitals, setHospitals] = useState(FALLBACK_HOSPITALS);
  const [hospitalId, setHospitalId] = useState("BCH");
  const [organization, setOrganization] = useState("Northeastern University");
  const [requesterTier, setRequesterTier] =
    useState<AccessRequest["requester_tier"]>("edu_research");
  const [query, setQuery] = useState("degenerative imaging findings");
  const [modality, setModality] = useState<Modality | "">("");
  const [bodyPart, setBodyPart] = useState<BodyPart | "">("");
  const [ageBand, setAgeBand] = useState<AgeBand | "">("");
  const [condition, setCondition] = useState<Condition | "">("degenerative");
  const [searched, setSearched] = useState(true);
  const [searchResult, setSearchResult] =
    useState<AggregatedResult>(PREVIEW_SEARCH_RESULT);
  const [searchMode, setSearchMode] = useState<DataMode>("preview");
  const [nodesMode, setNodesMode] = useState<DataMode>("preview");
  const [createdRequest, setCreatedRequest] = useState<AccessRequest | null>(
    null,
  );

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
          }).map((hospital, index) => ({
            ...hospital,
            studies: nodes[index].record_count ?? hospital.studies,
            status:
              nodes[index].status === "online"
                ? ("online" as const)
                : ("syncing" as const),
          })),
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
    setActivePage(role === "researcher" ? "Discover Cohorts" : "Node Overview");
    setScreen(role === "researcher" ? "researcher-dashboard" : "hospital-dashboard");
    if (role === "researcher") void executeSearch();
  }

  async function executeSearch(text = query, resetFilters = false) {
    setSearched(false);
    const interpreted = interpretQuery(text);
    const nextModality = interpreted.modality ?? (resetFilters ? "" : modality);
    const nextBodyPart = interpreted.bodyPart ?? (resetFilters ? "" : bodyPart);
    const nextAgeBand = interpreted.ageBand ?? (resetFilters ? "" : ageBand);
    const nextCondition = interpreted.condition ?? (resetFilters ? "" : condition);
    setModality(nextModality);
    setBodyPart(nextBodyPart);
    setAgeBand(nextAgeBand);
    setCondition(nextCondition);
    const payload: DiscoveryQuery = {
      query_id: crypto.randomUUID(),
      ...(nextModality && { modality: nextModality }),
      ...(nextBodyPart && { body_part: nextBodyPart }),
      ...(nextAgeBand && { age_band: nextAgeBand }),
      ...(nextCondition && { condition_category: nextCondition }),
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

  function runSearch(event: FormEvent) {
    event.preventDefault();
    void executeSearch();
  }

  function runPreset(text: string) {
    setQuery(text);
    setModality("");
    setBodyPart("");
    setAgeBand("");
    setCondition("");
    void executeSearch(text, true);
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
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={() => setScreen("login")}
      />
      {screen === "researcher-dashboard" ? (
        <ResearcherDashboard
          query={query}
          setQuery={setQuery}
          searched={searched}
          runSearch={runSearch}
          runPreset={runPreset}
          result={searchResult}
          dataMode={searchMode}
          organization={organization}
          requesterTier={requesterTier}
          activePage={activePage}
          modality={modality}
          setModality={setModality}
          bodyPart={bodyPart}
          setBodyPart={setBodyPart}
          ageBand={ageBand}
          setAgeBand={setAgeBand}
          condition={condition}
          setCondition={setCondition}
          createdRequest={createdRequest}
          setCreatedRequest={setCreatedRequest}
          onNavigate={setActivePage}
        />
      ) : (
        <HospitalDashboard
          hospital={selectedHospital}
          nodesMode={nodesMode}
          activePage={activePage}
        />
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
  activePage,
  onNavigate,
  onLogout,
}: {
  role: Role;
  hospital?: Hospital;
  requesterTier: AccessRequest["requester_tier"];
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) {
  const researcherNav = [
    { label: "Dashboard", icon: "overview" },
    { label: "Discover Cohorts", icon: "search" },
    { label: "Saved Cohorts", icon: "bookmark", badge: "3" },
    { label: "Access Requests", icon: "request", badge: "2" },
    { label: "Approved Data", icon: "folder" },
    { label: "My Activity", icon: "activity" },
    { label: "Researcher Profile", icon: "profile", separated: true },
  ];
  const hospitalNav = [
    { label: "Node Overview", icon: "overview" },
    { label: "Access Requests", icon: "request", badge: "2" },
    { label: "Query Activity", icon: "activity" },
    { label: "Data Policy", icon: "policy" },
    { label: "Audit Trail", icon: "audit" },
    { label: "Organization", icon: "profile", separated: true },
  ];
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
        {(role === "researcher" ? researcherNav : hospitalNav).map((item) => (
          <button
            className={`${activePage === item.label ? "active" : ""} ${item.separated ? "nav-separated" : ""}`}
            key={item.label}
            onClick={() => onNavigate(item.label)}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
            {item.badge && <em>{item.badge}</em>}
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

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></>,
    bookmark: <><path d="M6 3.5h12v17l-6-3.5-6 3.5z" /><path d="M9 3.5v7l3-2 3 2v-7" /></>,
    request: <><path d="M7 3.5h8l4 4v13H7z" /><path d="M15 3.5v4h4M10 13l2 2 4-4" /></>,
    folder: <path d="M3 7h7l2-2h4l2 3h3l-2 11H4z" />,
    activity: <path d="M2.5 13h4l2.5-8 4 14 3-9 2 3h3.5" />,
    profile: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="9.5" r="3" /><path d="M6.5 18c.8-3 2.7-4.5 5.5-4.5s4.7 1.5 5.5 4.5" /></>,
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    policy: <><path d="M12 2.5 20 6v6c0 5-3.2 8-8 9.5C7.2 20 4 17 4 12V6z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    audit: <><path d="M6 3.5h12v17H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function ResearcherDashboard({
  query,
  setQuery,
  searched,
  runSearch,
  runPreset,
  result,
  dataMode,
  organization,
  requesterTier,
  activePage,
  modality,
  setModality,
  bodyPart,
  setBodyPart,
  ageBand,
  setAgeBand,
  condition,
  setCondition,
  createdRequest,
  setCreatedRequest,
  onNavigate,
}: {
  query: string;
  setQuery: (value: string) => void;
  searched: boolean;
  runSearch: (event: FormEvent) => void;
  runPreset: (query: string) => void;
  result: AggregatedResult;
  dataMode: DataMode;
  organization: string;
  requesterTier: AccessRequest["requester_tier"];
  activePage: string;
  modality: Modality | "";
  setModality: (value: Modality | "") => void;
  bodyPart: BodyPart | "";
  setBodyPart: (value: BodyPart | "") => void;
  ageBand: AgeBand | "";
  setAgeBand: (value: AgeBand | "") => void;
  condition: Condition | "";
  setCondition: (value: Condition | "") => void;
  createdRequest: AccessRequest | null;
  setCreatedRequest: (request: AccessRequest | null) => void;
  onNavigate: (page: string) => void;
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
      const created = await api.createAccessRequest({
        requester_name: "Demo Requester",
        organization_name: organization,
        requester_tier: requesterTier,
        contact_email: "demo@medbridge.example",
        research_purpose: "Cohort feasibility and approved research analysis",
        query_summary: `${ageBand} · ${bodyPart} · ${modality} · ${condition}`,
        requested_node_id: requestNode,
        requested_data_level: "deidentified",
      });
      setCreatedRequest(created);
      setRequestStatus("sent");
    } catch {
      setCreatedRequest({
        request_id: "PREVIEW-REQUEST",
        status: "pending_hospital_review",
        requester_name: "Demo Requester",
        organization_name: organization,
        requester_tier: requesterTier,
        contact_email: "demo@medbridge.example",
        research_purpose: "Cohort feasibility and approved research analysis",
        query_summary: `${ageBand} · ${bodyPart} · ${modality} · ${condition}`,
        requested_node_id: requestNode,
        requested_data_level: "deidentified",
      });
      setRequestStatus("preview");
    }
  }

  if (activePage !== "Discover Cohorts") {
    return (
      <ResearcherPage
        page={activePage}
        organization={organization}
        requesterTier={requesterTier}
        createdRequest={createdRequest}
        setCreatedRequest={setCreatedRequest}
        query={query}
        setQuery={setQuery}
        onSearch={(event) => {
          onNavigate("Discover Cohorts");
          runSearch(event);
        }}
      />
    );
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
          <div className="preset-row" aria-label="Suggested searches">
            <span>Try a live query</span>
            <button type="button" onClick={() => runPreset("pediatric brain MRI with tumors")}>
              Pediatric tumor MRI
            </button>
            <button type="button" onClick={() => runPreset("brain CT with stroke")}>
              Brain CT + stroke
            </button>
            <button className="privacy-preset" type="button" onClick={() => runPreset("degenerative imaging findings")}>
              Privacy demo · &lt;10
            </button>
          </div>
          <div className="filter-row">
            <label>
              Modality
              <select
                value={modality}
                onChange={(event) =>
                  setModality(
                    event.target.value as NonNullable<
                      DiscoveryQuery["modality"]
                    >,
                  )
                }
              >
                <option value="">Any modality</option>
                {["MR", "CT", "US", "XR", "PT", "NM", "MG", "OT"].map(
                  (value) => <option key={value}>{value}</option>,
                )}
              </select>
            </label>
            <label>
              Body part
              <select
                value={bodyPart}
                onChange={(event) =>
                  setBodyPart(
                    event.target.value as NonNullable<
                      DiscoveryQuery["body_part"]
                    >,
                  )
                }
              >
                <option value="">Any body part</option>
                {["BRAIN", "HEART", "FETAL", "CHEST", "ABDOMEN", "SPINE", "OTHER"].map(
                  (value) => <option key={value}>{value}</option>,
                )}
              </select>
            </label>
            <label>
              Age band
              <select
                value={ageBand}
                onChange={(event) =>
                  setAgeBand(
                    event.target.value as NonNullable<
                      DiscoveryQuery["age_band"]
                    >,
                  )
                }
              >
                <option value="">Any age band</option>
                {["0-1", "2-5", "6-12", "13-21", "22-40", "41-64", "65-89", "90+"].map(
                  (value) => <option key={value}>{value}</option>,
                )}
              </select>
            </label>
            <label>
              Condition
              <select
                value={condition}
                onChange={(event) =>
                  setCondition(
                    event.target.value as NonNullable<
                      DiscoveryQuery["condition_category"]
                    >,
                  )
                }
              >
                <option value="">Any condition</option>
                {[
                  "neoplasm",
                  "ischemia",
                  "hemorrhage",
                  "congenital_anomaly",
                  "inflammatory",
                  "degenerative",
                  "normal",
                  "other",
                ].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <span>3 hospitals selected</span>
          </div>
        </form>

        {!searched ? (
          <div className="loading-state">Querying hospital nodes…</div>
        ) : (
          <>
            {dataMode === "preview" && (
              <div className="integration-banner">
                Hospital services are not running in this preview · The Portal API
                is fully wired and will show Agnel’s live counts when the stack is up.
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
              <div className="privacy-explainer">
                <div className="privacy-lock">⌁</div>
                <div>
                  <strong>Why does MedBridge show &lt;10?</strong>
                  <p>
                    When a hospital finds 1–9 matching studies, the node suppresses
                    the exact number to reduce re-identification risk. Zero remains
                    visible as 0; ten or more returns an exact aggregate count.
                  </p>
                </div>
                <span>k-anonymity threshold · k=10</span>
              </div>
            </section>

            <aside className="interpretation-card">
              <p className="eyebrow">Query interpretation</p>
              <h3>How MedBridge read your search</h3>
              <div className="query-quote">“{query}”</div>
              <dl>
                <div><dt>Age band</dt><dd>{ageBand || "ANY"}</dd></div>
                <div><dt>Body part</dt><dd>{bodyPart || "ANY"}</dd></div>
                <div><dt>Modality</dt><dd>{modality || "ANY"}</dd></div>
                <div><dt>Condition</dt><dd>{condition ? condition.toUpperCase() : "ANY"}</dd></div>
              </dl>
              <div className="semantic-path">
                <span>{query.match(/tumou?r|glioma|astrocytoma|stroke|degenerat\w*/i)?.[0] ?? "Natural language"}</span>
                <b>→</b>
                <span>{condition ? condition.replace("_", " ") : "structured cohort"}</span>
              </div>
              <div className="confidence-row">
                <span>Semantic mapping confidence</span><strong>96%</strong>
                <div><i /></div>
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
  activePage,
}: {
  hospital?: Hospital;
  nodesMode: DataMode;
  activePage: string;
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

  if (activePage !== "Node Overview") {
    return <HospitalPage page={activePage} hospital={hospital} />;
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

function ResearcherPage({
  page,
  organization,
  requesterTier,
  createdRequest,
  setCreatedRequest,
  query,
  setQuery,
  onSearch,
}: {
  page: string;
  organization: string;
  requesterTier: AccessRequest["requester_tier"];
  createdRequest: AccessRequest | null;
  setCreatedRequest: (request: AccessRequest | null) => void;
  query: string;
  setQuery: (value: string) => void;
  onSearch: (event: FormEvent) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function refreshRequest() {
    if (
      !createdRequest?.request_id ||
      createdRequest.request_id.startsWith("PREVIEW")
    ) {
      return;
    }
    setRefreshing(true);
    try {
      setCreatedRequest(
        await api.getAccessRequest(
          createdRequest.requested_node_id,
          createdRequest.request_id,
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }

  const titleMap: Record<string, [string, string]> = {
    Dashboard: [
      "Research Dashboard",
      "Your privacy-safe imaging discovery workspace.",
    ],
    "Saved Cohorts": [
      "Saved Cohorts",
      "Return to promising cohort definitions without storing patient-level data.",
    ],
    "Access Requests": [
      "My Access Requests",
      "Track decentralized hospital review and respond to information requests.",
    ],
    "Approved Data": [
      "Approved Data",
      "Open time-limited pathways to hospital-approved de-identified data.",
    ],
    "My Activity": [
      "My Activity",
      "A personal history of searches, cohort saves, and access decisions.",
    ],
    "Researcher Profile": [
      "Researcher Profile",
      "Manage your identity, organization, and research access classification.",
    ],
  };
  const [title, subtitle] = titleMap[page] ?? [page, ""];

  return (
    <main className="dashboard">
      <Topbar label="Researcher Portal" identity="Dr. Amelia Jorgenson" />
      <form className="global-research-search" onSubmit={onSearch}>
        <span className="global-search-icon">⌕</span>
        <div>
          <small>Search the federated hospital network</small>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “pediatric brain MRI with tumors”"
            aria-label="Search hospital cohorts"
          />
        </div>
        <kbd>Enter</kbd>
        <button type="submit">Search cohorts</button>
      </form>
      <div className="dashboard-content">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Researcher workspace</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="tier-badge">
            {requesterTier === "edu_research"
              ? "Education / Research"
              : "Business / Commercial"}
          </span>
        </header>

        {page === "Dashboard" && (
          <>
            <section className="stat-grid">
              <Stat label="Participating hospitals" value="3" note="BCH · MGH · BWH" />
              <Stat label="Available studies" value="2,700" note="Synthetic demo records" />
              <Stat label="Saved cohorts" value="4" note="2 updated this week" />
              <Stat label="Active requests" value="1" note="Under hospital review" />
            </section>
            <div className="overview-grid">
              <section className="insight-card wide">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">Federated availability</p>
                    <h2>Studies by hospital</h2>
                  </div>
                  <span className="live-label">Federated network</span>
                </div>
                <div className="bar-chart" aria-label="Studies by hospital">
                  {[
                    ["BCH", 74],
                    ["MGH", 92],
                    ["BWH", 82],
                  ].map(([label, height]) => (
                    <div className="bar-item" key={label}>
                      <span style={{ height: `${height}%` }} />
                      <strong>{label}</strong>
                      <small>900 studies</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="insight-card">
                <p className="eyebrow">Recent discovery</p>
                <h2>Pediatric brain MR</h2>
                <div className="donut"><span>70+</span></div>
                <p className="card-copy">
                  Confirmed neoplasm matches across three hospital nodes.
                </p>
              </section>
            </div>
            <section className="timeline-card">
              <div className="section-title">
                <div><p className="eyebrow">Your work</p><h2>Recent activity</h2></div>
                <button>View activity</button>
              </div>
              <ActivityRows />
            </section>
          </>
        )}

        {page === "Saved Cohorts" && (
          <section className="collection-grid">
            {[
              ["Pediatric brain MR — Neoplasm", "BRAIN · MR · Pediatric", "70+ confirmed"],
              ["Adult cardiac MR — Cardiomyopathy", "HEART · MR · Adult", "118 confirmed"],
              ["Fetal MR — Neural tube defect", "FETAL · MR · Prenatal", "Protected cohort"],
              ["Brain CT — Ischemia", "BRAIN · CT · Adult", "204 confirmed"],
            ].map(([name, filters, count]) => (
              <article className="cohort-card" key={name}>
                <span className="cohort-symbol">◇</span>
                <p className="eyebrow">Saved cohort</p>
                <h2>{name}</h2>
                <p>{filters}</p>
                <div><strong>{count}</strong><button>Run again →</button></div>
              </article>
            ))}
          </section>
        )}

        {page === "Access Requests" && (
          <section className="records-panel">
            <div className="records-tabs"><button className="active">All requests</button><button>Pending</button><button>Approved</button></div>
            {createdRequest && (
              <article className="access-record live-request-record">
                <span
                  className={`status-dot ${
                    createdRequest.status === "approved"
                      ? "approved"
                      : "pending"
                  }`}
                />
                <div>
                  <strong>{createdRequest.query_summary}</strong>
                  <small>
                    {createdRequest.requested_node_id} Hospital Node ·{" "}
                    {createdRequest.request_id}
                  </small>
                </div>
                <span
                  className={`status-pill ${
                    createdRequest.status === "approved"
                      ? "approved"
                      : "pending"
                  }`}
                >
                  {createdRequest.status?.replaceAll("_", " ")}
                </span>
                <time>Current session</time>
                <button onClick={refreshRequest} disabled={refreshing}>
                  {refreshing ? "Refreshing…" : "Refresh status"}
                </button>
              </article>
            )}
            <article className="access-record">
              <span className="status-dot pending" />
              <div>
                <strong>Pediatric brain MR — Neoplasm</strong>
                <small>Boston Children’s Hospital · REQ-2048</small>
              </div>
              <span className="status-pill pending">Under hospital review</span>
              <time>Submitted today</time>
              <button>View details →</button>
            </article>
            <article className="access-record">
              <span className="status-dot approved" />
              <div>
                <strong>Adult brain CT — Ischemia</strong>
                <small>Massachusetts General Hospital · REQ-1982</small>
              </div>
              <span className="status-pill approved">Approved</span>
              <time>Jul 23, 2026</time>
              <button>Open pathway →</button>
            </article>
          </section>
        )}

        {page === "Approved Data" && (
          <div className="approved-grid">
            <section className="approved-hero">
              <span className="approved-icon">
                {createdRequest?.status === "approved" ? "✓" : "…"}
              </span>
              <p className="eyebrow">
                {createdRequest?.status === "approved"
                  ? "Hospital approved"
                  : "Hospital approval required"}
              </p>
              <h2>
                {createdRequest?.query_summary ?? "No active approved dataset"}
              </h2>
              <p>
                {createdRequest?.status === "approved"
                  ? `${createdRequest.requested_node_id} approved access to the de-identified data layer for your stated research purpose.`
                  : "Submit a cohort access request and wait for the owning hospital node to approve it. Discovery results alone never grant data access."}
              </p>
              {createdRequest && (
                <dl>
                  <div><dt>Status</dt><dd>{createdRequest.status?.replaceAll("_", " ")}</dd></div>
                  <div><dt>Data level</dt><dd>De-identified</dd></div>
                  <div><dt>Organization</dt><dd>{organization}</dd></div>
                </dl>
              )}
              <button
                className="primary-button"
                disabled={createdRequest?.status !== "approved"}
              >
                {createdRequest?.status === "approved"
                  ? "Open secure pathway →"
                  : "Awaiting hospital approval"}
              </button>
            </section>
            <aside className="boundary-card">
              <p className="eyebrow">Demo boundary</p>
              <h3>Secure pathway stub</h3>
              <p>
                The prototype demonstrates approval and gated access. It does
                not transfer real medical records.
              </p>
            </aside>
          </div>
        )}

        {page === "My Activity" && (
          <section className="timeline-card">
            <div className="activity-header">
              <div><p className="eyebrow">Personal history</p><h2>July 25, 2026</h2></div>
              <button>Export demo log</button>
            </div>
            <ActivityRows expanded />
          </section>
        )}

        {page === "Researcher Profile" && (
          <div className="profile-layout">
            <section className="profile-card">
              <div className="profile-identity">
                <span>AJ</span>
                <div>
                  <h2>Dr. Amelia Jorgenson</h2>
                  <p>Principal Investigator · Medical Imaging Research</p>
                </div>
                <button>Edit profile</button>
              </div>
              <dl className="profile-details">
                <div><dt>Organization</dt><dd>{organization}</dd></div>
                <div><dt>Researcher tier</dt><dd>{requesterTier === "edu_research" ? "Education / Research" : "Business / Commercial"}</dd></div>
                <div><dt>Verified email</dt><dd>amelia@northeastern.edu</dd></div>
                <div><dt>IRB affiliation</dt><dd>NU Research Office · Active</dd></div>
              </dl>
            </section>
            <aside className="profile-trust">
              <p className="eyebrow">Authorization status</p>
              <h3>Verified researcher</h3>
              <div className="trust-score"><span>✓</span><strong>Identity verified</strong></div>
              <div className="trust-score"><span>✓</span><strong>Organization verified</strong></div>
              <div className="trust-score"><span>✓</span><strong>Research tier active</strong></div>
              <p>Hospital approval is still required separately for every requested cohort.</p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function HospitalPage({
  page,
  hospital,
}: {
  page: string;
  hospital?: Hospital;
}) {
  const [liveRequests, setLiveRequests] = useState<AccessRequest[]>([]);
  const [requestsLive, setRequestsLive] = useState(false);

  useEffect(() => {
    if (page !== "Access Requests" || !hospital) return;
    api
      .listNodeRequests(hospital.node_id)
      .then((requests) => {
        setLiveRequests(requests);
        setRequestsLive(true);
      })
      .catch(() => {
        setLiveRequests(
          PREVIEW_ACCESS_REQUESTS.map((request) => ({
            ...request,
            requested_node_id: hospital.node_id,
          })),
        );
        setRequestsLive(false);
      });
  }, [hospital, page]);

  async function reviewRequest(
    requestId: string | undefined,
    decision: "approved" | "rejected",
  ) {
    if (!hospital || !requestId) return;
    try {
      const updated = await api.decide(hospital.node_id, requestId, decision);
      setLiveRequests((requests) =>
        requests.map((request) =>
          request.request_id === requestId ? updated : request,
        ),
      );
      setRequestsLive(true);
    } catch {
      setLiveRequests((requests) =>
        requests.map((request) =>
          request.request_id === requestId
            ? { ...request, status: decision }
            : request,
        ),
      );
    }
  }

  const titleMap: Record<string, [string, string]> = {
    "Access Requests": [
      "Access Request Queue",
      "Review requests addressed only to your hospital node.",
    ],
    "Query Activity": [
      "Privacy-Safe Query Activity",
      "Monitor federated discovery without exposing patient-level records.",
    ],
    "Data Policy": [
      "Local Data Policy",
      "Your hospital enforces disclosure rules before every response.",
    ],
    "Audit Trail": [
      "Hospital Audit Trail",
      "Review simulated node events and access decisions.",
    ],
    Organization: [
      "Organization Settings",
      "Hospital identity, research office contact, and node configuration.",
    ],
  };
  const [title, subtitle] = titleMap[page] ?? [page, ""];

  return (
    <main className="dashboard">
      <Topbar label="Hospital Organization Portal" identity={`${hospital?.node_id} Reviewer`} />
      <div className="dashboard-content">
        <header className="page-heading hospital-heading">
          <div>
            <p className="eyebrow">Hospital-controlled workspace</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="node-online">● {hospital?.node_id} node online</span>
        </header>

        {page === "Access Requests" && (
          <section className="records-panel hospital-records">
            {!requestsLive && (
              <div className="integration-banner compact">
                Preview queue shown while this hospital node is unavailable.
              </div>
            )}
            <div className="records-tabs"><button className="active">Pending 2</button><button>Approved</button><button>Denied</button></div>
            {liveRequests.map((request) => (
              <article className="review-record" key={request.request_id}>
                <div className="request-id">{request.request_id}</div>
                <div>
                  <strong>{request.requester_name}</strong>
                  <small>{request.organization_name}</small>
                  <p>{request.research_purpose}</p>
                </div>
                <span className="tier-badge">
                  {request.requester_tier === "edu_research" ? "Education / Research" : "Business / Commercial"}
                </span>
                <div className="review-actions">
                  {request.status === "pending_hospital_review" ? (
                    <>
                      <button>Request info</button>
                      <button
                        onClick={() =>
                          reviewRequest(request.request_id, "rejected")
                        }
                      >
                        Deny
                      </button>
                      <button
                        className="approve"
                        onClick={() =>
                          reviewRequest(request.request_id, "approved")
                        }
                      >
                        Approve
                      </button>
                    </>
                  ) : (
                    <span className="status-pill approved">
                      {request.status?.replaceAll("_", " ")}
                    </span>
                  )}
                </div>
              </article>
            ))}
            {!liveRequests.length && (
              <div className="empty-queue">
                No access requests for this hospital node.
              </div>
            )}
          </section>
        )}

        {page === "Query Activity" && (
          <div className="overview-grid">
            <section className="insight-card wide">
              <div className="section-title"><div><p className="eyebrow">Last 7 days</p><h2>Queries answered</h2></div><strong>842</strong></div>
              <div className="spark-bars">
                {[48, 62, 54, 79, 66, 88, 72, 94, 76, 84, 91, 69].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
              </div>
            </section>
            <section className="insight-card">
              <p className="eyebrow">Disclosure control</p>
              <h2>126 protected responses</h2>
              <p className="card-copy">Small-cohort suppression applied locally before responses left this node.</p>
              <div className="policy-score">100% <small>local enforcement</small></div>
            </section>
          </div>
        )}

        {page === "Data Policy" && (
          <div className="policy-layout">
            <section className="policy-editor">
              <p className="eyebrow">Active policy</p>
              <h2>Discovery disclosure controls</h2>
              <PolicyRow label="Small-cohort threshold" value="Fewer than 10" />
              <PolicyRow label="Maximum access level" value="De-identified only" />
              <PolicyRow label="Exact age exposure" value="Blocked · age bands only" />
              <PolicyRow label="Clinical free text" value="Blocked · categories only" />
              <PolicyRow label="Patient identifiers" value="Always blocked" />
              <button className="hospital-primary">Policy managed by hospital node</button>
            </section>
            <aside className="boundary-card">
              <p className="eyebrow">Privacy boundary</p>
              <h3>Enforced locally</h3>
              <p>Portal requests cannot override this hospital’s privacy policy or approval decisions.</p>
            </aside>
          </div>
        )}

        {page === "Audit Trail" && (
          <section className="audit-table">
            <div className="audit-head"><span>Event ID</span><span>Action</span><span>Actor</span><span>Result</span><span>Time</span></div>
            {[
              ["EVT-88A1", "Access request reviewed", "BCH Reviewer", "Approved", "14:08"],
              ["EVT-889F", "Cohort query", "Portal Aggregator", "Suppressed", "13:56"],
              ["EVT-889A", "Access request created", "Northeastern University", "Pending", "13:42"],
              ["EVT-8884", "Node policy check", "BCH Node", "Passed", "13:31"],
            ].map((row) => <div className="audit-row" key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}</div>)}
          </section>
        )}

        {page === "Organization" && (
          <div className="organization-grid">
            <section className="organization-card">
              <div className="org-monogram">{hospital?.node_id}</div>
              <div><p className="eyebrow">Hospital organization</p><h2>{hospital?.name}</h2><p>{hospital?.specialty}</p></div>
            </section>
            <section className="settings-card">
              <h3>Research Data Access Office</h3>
              <label>Department email<input value={`synthetic-${hospital?.node_id.toLowerCase()}@example.org`} readOnly /></label>
              <label>Node identifier<input value={hospital?.node_id} readOnly /></label>
              <p>Demo contacts are synthetic and must not be used for real medical-data requests.</p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function ActivityRows({ expanded = false }: { expanded?: boolean }) {
  const rows = [
    ["Search", "Pediatric brain MR with tumors", "3 hospital nodes", "10:42"],
    ["Access request", "Pediatric brain MR — Neoplasm", "BCH", "10:49"],
    ["Approval", "Adult brain CT — Ischemia", "MGH", "Yesterday"],
    ...(expanded
      ? [
          ["Saved cohort", "Fetal MR — Neural tube defect", "3 nodes", "Jul 23"],
          ["Search", "Adult cardiac MR", "3 nodes", "Jul 22"],
        ]
      : []),
  ];
  return (
    <div className="activity-list">
      {rows.map(([kind, detail, source, time]) => (
        <div className="activity-row" key={`${kind}-${detail}`}>
          <span className="activity-symbol">{kind.slice(0, 1)}</span>
          <div><strong>{kind}</strong><p>{detail}</p></div>
          <span>{source}</span><time>{time}</time>
        </div>
      ))}
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: string }) {
  return <div className="policy-row"><span>{label}</span><strong>{value}</strong><b>✓</b></div>;
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
