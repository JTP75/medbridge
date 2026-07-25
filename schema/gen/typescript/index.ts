/**
 * GENERATED FILE - do not edit by hand.
 * Source of truth: schema/schemas/*.schema.json
 * Regenerate with: schema/scripts/generate.sh
 */

// ---- access_request ----
/**
 * Sent by the Portal to a hospital node's /api/access/requests endpoint, and returned by the node's request-status/list endpoints. Both requester tiers are limited to 'deidentified' data — see architecture.md 'Requester Model'.
 */
export interface AccessRequest {
  /**
   * Assigned by the node on creation; absent on the initial POST body.
   */
  request_id?: string;
  /**
   * Lifecycle state per architecture.md's decentralized access-request state diagram. Assigned/owned by the node; absent on the initial POST body.
   */
  status?: "pending_hospital_review" | "more_information_requested" | "approved" | "rejected" | "revoked" | "expired";
  /**
   * Self-declared requester name or demo user identifier.
   */
  requester_name: string;
  /**
   * Self-declared organization name, always shown to the hospital reviewer.
   */
  organization_name: string;
  /**
   * One of the two demo tiers. Both are limited to requested_data_level='deidentified'.
   */
  requester_tier: "edu_research" | "business_commercial";
  /**
   * Requester contact email.
   */
  contact_email: string;
  /**
   * Free-text purpose statement, self-declared.
   */
  research_purpose: string;
  /**
   * Human-readable summary of the discovery query that led to this request.
   */
  query_summary: string;
  /**
   * The specific hospital node this request is addressed to.
   */
  requested_node_id: string;
  /**
   * Fixed to 'deidentified' for the demo; no tier may request more than this.
   */
  requested_data_level: "deidentified";
  /**
   * Optional reviewer note attached on approve/deny/more-information.
   */
  decision_note?: string;
}

// ---- imaging_record ----
/**
 * The 'safe shape' a hospital node derives from a raw study record and holds in memory. additionalProperties is false on purpose: any field not explicitly listed must be rejected before a record is used by search/response logic. This is also the shape released, one row per study, as the de-identified patient data layer after a hospital approves an access request.
 */
export interface ImagingRecord {
  /**
   * Identifier of the hospital node this record belongs to.
   */
  node_id: string;
  /**
   * DICOM imaging modality code.
   */
  modality: "MR" | "CT" | "US" | "XR" | "PT" | "NM" | "MG" | "OT";
  /**
   * Controlled body-part / anatomy vocabulary.
   */
  body_part: "BRAIN" | "HEART" | "FETAL" | "CHEST" | "ABDOMEN" | "SPINE" | "OTHER";
  /**
   * Bucketed age range. Never an exact birthdate or exact age. The 90+ band satisfies HIPAA Safe Harbor aggregation of ages over 89 (see MENTOR_NOTES.md).
   */
  age_band: "0-1" | "2-5" | "6-12" | "13-21" | "22-40" | "41-64" | "65-89" | "90+";
  /**
   * Administrative sex.
   */
  sex: "F" | "M" | "O" | "U";
  /**
   * Year only, never an exact acquisition date.
   */
  acquisition_year: number;
  /**
   * Normalized condition/ontology bucket derived from the free-text diagnosis, not free-text itself. Owner: Jaewon (semantic mapping) for the mapping logic; this enum is the shared contract.
   */
  condition_category:
    | "neoplasm"
    | "ischemia"
    | "hemorrhage"
    | "congenital_anomaly"
    | "inflammatory"
    | "degenerative"
    | "normal"
    | "other";
}

// ---- query ----
/**
 * Sent by the Portal to a hospital node's /api/beacon/query endpoint. All fields optional except query_id — an empty query means 'match everything'. Filter enums mirror imaging_record.schema.json's controlled vocabularies.
 */
export interface DiscoveryQuery {
  /**
   * Caller-generated id for correlating this query across nodes/responses.
   */
  query_id: string;
  /**
   * Filter by imaging modality.
   */
  modality?: "MR" | "CT" | "US" | "XR" | "PT" | "NM" | "MG" | "OT";
  /**
   * Filter by broad body site.
   */
  body_part?: "BRAIN" | "HEART" | "FETAL" | "CHEST" | "ABDOMEN" | "SPINE" | "OTHER";
  /**
   * Filter by bucketed age range.
   */
  age_band?: "0-1" | "2-5" | "6-12" | "13-21" | "22-40" | "41-64" | "65-89" | "90+";
  /**
   * Filter by administrative sex.
   */
  sex?: "F" | "M" | "O" | "U";
  /**
   * Filter by acquisition year.
   */
  acquisition_year?: number;
  /**
   * Filter by normalized condition/ontology bucket.
   */
  condition_category?:
    | "neoplasm"
    | "ischemia"
    | "hemorrhage"
    | "congenital_anomaly"
    | "inflammatory"
    | "degenerative"
    | "normal"
    | "other";
}

// ---- search_response ----
/**
 * Returned by a hospital node's /api/beacon/query endpoint. Matches architecture.md's 'Two Schema Layers > Search/metadata layer' section. A suppressed match must never carry a raw count.
 */
export interface SearchResponse {
  /**
   * Echoes the DiscoveryQuery.query_id this response answers.
   */
  query_id: string;
  /**
   * Identifier of the responding hospital node.
   */
  node_id: string;
  match: {
    /**
     * Whether any records matched, without revealing a count.
     */
    exists: boolean;
    /**
     * Exact count when at/above this node's small_cohort_threshold; null when suppressed.
     */
    count: number | null;
    /**
     * Human-readable count string safe to render, e.g. '<10' or '47'. The Portal must render this, not `count`, so suppression cannot be bypassed.
     */
    display_count: string | null;
    /**
     * True if count was withheld due to small-cohort policy.
     */
    suppressed: boolean;
    /**
     * Why the count was suppressed, or null when not suppressed.
     */
    suppression_reason?: "small_cohort" | null;
  };
  /**
   * Data types available at this node if an access request is later approved.
   */
  available_data: "deidentified-imaging-metadata"[];
  /**
   * Whether this node currently accepts access requests.
   */
  access_request_supported: boolean;
}

