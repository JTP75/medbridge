/**
 * GENERATED FILE - do not edit by hand.
 * Source of truth: schema/schemas/*.schema.json
 * Regenerate with: schema/scripts/generate.sh
 */

// ---- access_request ----
/**
 * STUB — placeholder shape, to be finalized by Agnel (schema owner) with Yizhen (tier/access policy) and Justin (contract boundary). Sent by the Portal to a hospital node's /api/access/requests endpoint, and returned by the node's request-status/list endpoints. Both requester tiers are limited to 'deidentified' data — see architecture.md 'Requester Model'.
 */
export interface AccessRequest {
  /**
   * Assigned by the node on creation; absent on the initial POST body.
   */
  request_id?: string;
  /**
   * STUB — lifecycle state per architecture.md's decentralized access-request state diagram. Assigned/owned by the node; absent on the initial POST body.
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
   * STUB — fixed to 'deidentified' for the demo; no tier may request more than this.
   */
  requested_data_level: "deidentified";
  /**
   * STUB — optional reviewer note attached on approve/deny/more-information.
   */
  decision_note?: string;
}

// ---- imaging_record ----
/**
 * STUB — placeholder shape, to be finalized by Agnel (schema owner). The 'safe shape' a hospital node is allowed to derive from a raw study record. Fields here are illustrative only; do not treat as final. additionalProperties is false on purpose: any field not explicitly listed must be rejected before a record is used by search/response logic.
 */
export interface ImagingRecord {
  /**
   * STUB — identifier of the hospital node this record belongs to (e.g. BCH, MGH, BWH).
   */
  node_id: string;
  /**
   * STUB — imaging modality, e.g. MR, CT.
   */
  modality: string;
  /**
   * STUB — broad body site, e.g. BRAIN.
   */
  body_part: string;
  /**
   * STUB — bucketed age range, e.g. '6-12'. Never an exact birthdate or exact age.
   */
  age_band: string;
  /**
   * STUB — broad sex category, placeholder enum to be defined by Agnel/Jaewon.
   */
  sex: string;
  /**
   * STUB — year only, never an exact acquisition date.
   */
  acquisition_year: number;
  /**
   * STUB — normalized condition/ontology bucket (e.g. 'neoplasm', 'ischemia'), not free-text diagnosis. Owner: Jaewon (semantic mapping).
   */
  condition_category: string;
}

// ---- query ----
/**
 * STUB — placeholder shape, to be finalized by Agnel (schema owner) with Yizhen (search query semantics). Sent by the Portal to a hospital node's /api/beacon/query endpoint. All fields optional except query_id — an empty query means 'match everything'.
 */
export interface DiscoveryQuery {
  /**
   * Caller-generated id for correlating this query across nodes/responses.
   */
  query_id: string;
  /**
   * STUB — filter by imaging modality, e.g. MR.
   */
  modality?: string;
  /**
   * STUB — filter by broad body site, e.g. BRAIN.
   */
  body_part?: string;
  /**
   * STUB — filter by bucketed age range.
   */
  age_band?: string;
  /**
   * STUB — filter by normalized condition/ontology bucket.
   */
  condition_category?: string;
}

// ---- search_response ----
/**
 * STUB — placeholder shape, to be finalized by Agnel (schema owner) with Yizhen (access/privacy policy). Returned by a hospital node's /api/beacon/query endpoint. Matches the example in architecture.md's 'Two Schema Layers > Search/metadata layer' section. A suppressed match must never carry a raw count.
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
     * Exact count, or null when suppressed. STUB — policy owner Yizhen decides when this may be non-null (see architecture.md small-cohort threshold).
     */
    count: number | null;
    /**
     * Human-readable count string safe to render, e.g. '<10' or '47'.
     */
    display_count: string | null;
    /**
     * True if count was withheld due to small-cohort policy.
     */
    suppressed: boolean;
    /**
     * STUB — optional reason code, e.g. 'small_cohort'.
     */
    suppression_reason?: string;
  };
  /**
   * STUB — data types available if access is later approved, e.g. ['deidentified-dicom'].
   */
  available_data: string[];
  /**
   * Whether this node currently accepts access requests.
   */
  access_request_supported: boolean;
}

