[7/25/2026 12:57 pm] justin pacella: The Big Idea
Hospitals have medical scans (MRIs) sitting in their own private databases. A researcher might want to ask "how many pediatric brain MRIs with tumors exist across these hospitals?" — but hospitals can't just hand over patient records to answer that, because patient data is legally protected (HIPAA).

The trick: instead of sharing the actual records, each hospital only ever shares counts ("we have 47 matching studies") — never names, birthdates, or the actual scan/report. A researcher gets a number, not a person. This pattern is modeled on a real standard called GA4GH Beacon, used in genomics for the same reason.

Think of it like asking a library "how many books do you have about dragons?" — they tell you the count, they don't hand you the actual books with people's library cards attached.

The Two Halves of the Project
Component A (yours) — lives inside each hospital. Reads the hospital's raw, messy, PII-filled data and turns it into a small, safe, standardized summary. This is the "what can safely leave the building" layer.
Component B (Justin/Kelsey/Yizhen's Portal) — the researcher-facing search tool. It asks all the hospitals the same question at once, adds up their answers, checks who's asking, and decides what they're allowed to see.
What Component A Actually Does — Step by Step
1. The raw data problem
Each hospital's database has records like:

PatientName: "Smith^BabyBoy", PatientID: "CHB-66291", PatientAge: "005D",
Diagnosis: "...long paragraph mentioning MCA territory ischemic infarct..."
This is full of identifying info (name, ID, exact age in days, a free-text report that could describe someone uniquely).

2. The schema (schema/imaging_beacon.schema.json)
This is the "safe shape" — a strict contract that says a record broadcast to the outside world is only allowed to contain 7 harmless fields: which hospital, scan type (MR/CT/etc), body part, an age band (like "6-12" instead of an exact birthdate), sex, the year of the scan (not the exact date), and a general condition category (like "neoplasm" instead of the full report). Nothing else is permitted — if any stray field sneaks in, the record is automatically rejected. That's the core privacy guarantee.

3. The adapter (transform.py)
This is the translator. It takes one raw messy record and squeezes it down into the safe shape:

"005D" (5 days old) → age band "0-1"
"20260215" (exact date) → just the year 2026
The long diagnosis paragraph → a category like "ischemia"
Name, ID, birthdate, UID → simply thrown away (never even read)
4. The condition mapper (ontology.py)
A simple keyword scanner that reads the diagnosis text and decides which bucket it belongs to (mentions "infarct"/"stroke" → ischemia; mentions "tumor"/"mass" → neoplasm, etc). This is a placeholder — a teammate (Jaewon) will later swap in a smarter medical-terminology mapper without touching anything else.

5. Small-number protection (obfuscation.py)
Even a count can leak privacy. If a hospital says "we have exactly 1 record matching: 8-year-old, rare condition, female" — that's practically identifying someone. So: if the real count is small (below a threshold, e.g. under 10), the node reports 0 and flags it as "suppressed" instead of the real number. Only if enough people match does it show the exact count. We proved this live today — a real count of 19 got hidden as 0, obfuscated: true when a stricter threshold was applied.

6. The node itself (beacon_node.py)
This is a tiny web server each hospital runs. It loads its own data, runs it through the adapter once at startup (so raw PII is converted to safe data immediately and never touched again), and exposes exactly two endpoints:

/beacon/info — "who am I, how many studies do I have"
/beacon/query?body_part=BRAIN&modality=MR — "how many matches for these filters" → returns just a count
It deliberately does not expose any endpoint that returns actual records.

7. The proof (validate.py)
[7/25/2026 12:57 pm] justin pacella: A script that runs all 2,700 synthetic records (900 per hospital × 3 hospitals) through the adapter and double-checks: (a) every output matches the safe schema, (b) zero PII field names survive. Today it printed a clean PASS.

What We Verified Today
We actually started all three hospital "nodes" (BCH, MGH, BWH) on ports 8001/8002/8003 and queried them live over HTTP — confirming real counts come back for normal queries, and small/rare counts correctly get hidden. We also fixed a small bug where the code was pointing at a data folder path that didn't actually exist, so now everything runs self-contained with no setup fuss.

Where This Fits Next
Justin's portal isn't built yet in the shared repo — right now Component A stands alone but fully working. When his portal exists, it'll call /beacon/query on all three nodes, add the numbers together, and layer on: who's asking (anonymous vs. verified researcher vs. IRB-approved), which changes the suppression threshold, and finally a gated "request access to full records" pathway for the most trusted tier.