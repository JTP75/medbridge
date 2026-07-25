import re


SEMANTIC_MAP = {
    "tumor": {
        "tumor",
        "neoplasm",
        "glioma",
        "astrocytoma",
        "intracranial mass",
        "brain mass",
    },
    "stroke": {
        "stroke",
        "infarct",
        "infarction",
        "ischemia",
        "ischemic",
    },
    "hydrocephalus": {
        "hydrocephalus",
        "ventriculomegaly",
        "ventricular dilation",
        "dilated ventricles",
    },
    "brain hemorrhage": {
        "brain hemorrhage",
        "intracranial hemorrhage",
        "intracerebral hemorrhage",
        "intraparenchymal hemorrhage",
        "subarachnoid hemorrhage",
        "subdural hemorrhage",
        "hematoma",
        "bleed",
    },
    "seizure": {
        "seizure",
        "seizures",
        "epilepsy",
        "epileptic",
        "convulsion",
    },
    "cerebral edema": {
        "cerebral edema",
        "brain edema",
        "vasogenic edema",
        "cytotoxic edema",
        "brain swelling",
    },
    "multiple sclerosis": {
        "multiple sclerosis",
        "ms plaque",
        "demyelinating disease",
        "demyelination",
    },
    "cardiomyopathy": {
        "cardiomyopathy",
        "dilated cardiomyopathy",
        "hypertrophic cardiomyopathy",
        "restrictive cardiomyopathy",
        "ventricular hypertrophy",
    },
    "congenital heart disease": {
        "congenital heart disease",
        "congenital cardiac defect",
        "septal defect",
        "ventricular septal defect",
        "atrial septal defect",
        "tetralogy of fallot",
        "transposition of the great arteries",
    },
    "myocarditis": {
        "myocarditis",
        "myocardial inflammation",
        "inflammatory cardiomyopathy",
    },
    "valvular disease": {
        "valvular disease",
        "valve disease",
        "valvular heart disease",
        "valve stenosis",
        "valve regurgitation",
        "aortic stenosis",
        "mitral regurgitation",
    },
    "encephalocele": {
        "encephalocele",
        "meningoencephalocele",
        "cranial neural tube defect",
        "herniated brain tissue",
    },
    "spina bifida": {
        "spina bifida",
        "myelomeningocele",
        "meningocele",
        "open neural tube defect",
        "spinal dysraphism",
    },
    "fetal growth restriction": {
        "fetal growth restriction",
        "intrauterine growth restriction",
        "iugr",
        "small for gestational age",
    },
}


def normalize_text(value: object) -> str:
    value = str(value or "").lower().strip()
    value = re.sub(r"\s+", " ", value)
    return value


def expand_terms(query: str) -> list[str]:
    """Return clinical synonyms for every recognized concept in a query."""
    normalized_query = normalize_text(query)
    if not normalized_query:
        return []

    expanded_terms: set[str] = set()

    for concept, synonyms in SEMANTIC_MAP.items():
        if concept in normalized_query:
            expanded_terms.update(synonyms)
            continue

        if any(term in normalized_query for term in synonyms):
            expanded_terms.update(synonyms)

    if not expanded_terms:
        words = re.findall(r"[a-zA-Z]+", normalized_query)
        expanded_terms.update(words)

    return sorted(expanded_terms)


def matches_diagnosis(diagnosis: str, expanded_terms: list[str]) -> bool:
    """Return whether diagnosis contains any already-expanded search term."""
    normalized_diagnosis = normalize_text(diagnosis)
    normalized_terms = (normalize_text(term) for term in expanded_terms)

    return any(term and term in normalized_diagnosis for term in normalized_terms)


def expand_query_terms(query: str) -> list[str]:
    """Backward-compatible alias for callers using the original draft name."""
    return expand_terms(query)


def diagnosis_matches(diagnosis: str, query: str) -> bool:
    """Convenience wrapper that expands a raw query before matching."""
    return matches_diagnosis(diagnosis, expand_terms(query))


def semantic_match_score(diagnosis: str, query: str) -> float:
    normalized_diagnosis = normalize_text(diagnosis)
    expanded_terms = expand_terms(query)

    if not expanded_terms:
        return 0.0

    matches = sum(
        1 for term in expanded_terms
        if term in normalized_diagnosis
    )

    return round(matches / len(expanded_terms), 3)
