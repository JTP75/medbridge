import io
import json
from unittest.mock import patch

import pytest

from provider.client import (
    ProviderNodeError,
    fetch_mapped_studies,
    fetch_studies,
    map_studies,
)
from provider.schema_mapper import map_study_to_schema, parse_patient_age
from provider.semantic_mapping import (
    diagnosis_matches,
    expand_terms,
    matches_diagnosis,
)


def test_parse_age_years():
    result = parse_patient_age("007Y")

    assert result["age_value"] == 7
    assert result["age_unit"] == "years"
    assert result["age_group"] == "pediatric"


def test_parse_age_days():
    result = parse_patient_age("005D")

    assert result["age_value"] == 5
    assert result["age_unit"] == "days"
    assert result["age_group"] == "pediatric"


def test_parse_invalid_age():
    result = parse_patient_age("seven")

    assert result == {
        "age_value": None,
        "age_unit": None,
        "age_group": "unknown",
    }


def test_map_study():
    raw_study = {
        "PatientName": "Example^Patient",
        "PatientID": "CHB-12345",
        "PatientBirthDate": "20190304",
        "PatientAge": "007Y",
        "PatientSex": "F",
        "InstitutionName": "Boston Children's Hospital",
        "StudyID": "BR-7721",
        "StudyInstanceUID": "1.2.3.4.5",
        "StudyDate": "20260304",
        "Modality": "MR",
        "BodyPartExamined": "BRAIN",
        "Diagnosis": "Findings suggest a cerebral neoplasm.",
    }

    mapped = map_study_to_schema(raw_study)

    assert mapped["study_id"] == "BR-7721"
    assert mapped["provider_id"] == "BCH"
    assert mapped["age_value"] == 7
    assert mapped["modality"] == "MR"
    assert mapped["body_region"] == "brain"
    assert mapped["study_year"] == 2026
    assert "PatientName" not in mapped
    assert "PatientID" not in mapped


def test_map_study_normalizes_codes_and_rejects_invalid_date():
    mapped = map_study_to_schema(
        {
            "PatientAge": "045Y",
            "PatientSex": " f ",
            "InstitutionName": "Massachusetts General Hospital",
            "StudyDate": "20261340",
            "Modality": " mr ",
            "BodyPartExamined": " brain ",
            "Diagnosis": None,
        }
    )

    assert mapped["provider_id"] == "MGH"
    assert mapped["sex"] == "female"
    assert mapped["modality"] == "MR"
    assert mapped["body_region"] == "brain"
    assert mapped["study_year"] is None
    assert mapped["diagnosis_text"] == ""


def test_tumor_matches_neoplasm():
    diagnosis = "Findings are consistent with a cerebral neoplasm."

    assert diagnosis_matches(diagnosis, "brain tumor")


def test_expand_tumor():
    terms = expand_terms("pediatric brain tumor MRI")

    assert "neoplasm" in terms
    assert "glioma" in terms


def test_matches_diagnosis_accepts_expanded_terms():
    terms = expand_terms("pediatric brain tumor MRI")

    assert matches_diagnosis(
        "MRI findings are consistent with a low-grade cerebral neoplasm.",
        terms,
    )


def test_empty_query_does_not_match():
    assert expand_terms("") == []
    assert not diagnosis_matches("Cerebral neoplasm", "")


@pytest.mark.parametrize(
    ("query", "diagnosis"),
    [
        ("brain bleed", "Large acute intracranial hemorrhage is present."),
        ("epilepsy", "Findings may represent a seizure focus."),
        ("brain swelling", "Extensive vasogenic edema surrounds the lesion."),
        (
            "MS plaque",
            "Multiple foci of demyelination are seen in the white matter.",
        ),
        (
            "hypertrophic cardiomyopathy",
            "Marked ventricular hypertrophy is identified.",
        ),
        (
            "congenital heart disease",
            "Imaging demonstrates a ventricular septal defect.",
        ),
        ("myocarditis", "Findings suggest myocardial inflammation."),
        ("valve disease", "Severe mitral regurgitation is present."),
        (
            "encephalocele",
            "The sac contains herniated brain tissue.",
        ),
        (
            "spina bifida",
            "Fetal MRI confirms an open neural tube defect.",
        ),
        (
            "IUGR",
            "Estimated fetal size is small for gestational age.",
        ),
    ],
)
def test_expanded_clinical_concepts_match(query, diagnosis):
    assert diagnosis_matches(diagnosis, query)


def test_map_studies_maps_provider_node_collection():
    mapped = map_studies(
        [
            {
                "StudyID": "BR-1543",
                "PatientAge": "005D",
                "PatientSex": "M",
                "InstitutionName": "Boston Children's Hospital",
                "StudyDate": "20260215",
                "Modality": "MR",
                "BodyPartExamined": "BRAIN",
                "Diagnosis": "Acute left MCA territory ischemic infarct.",
            }
        ]
    )

    assert mapped == [
        {
            "study_id": "BR-1543",
            "provider_id": "BCH",
            "age_value": 5,
            "age_unit": "days",
            "age_group": "pediatric",
            "sex": "male",
            "modality": "MR",
            "body_region": "brain",
            "study_year": 2026,
            "diagnosis_text": "Acute left MCA territory ischemic infarct.",
        }
    ]


class _MockResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def test_fetch_mapped_studies_uses_provider_node_endpoint():
    payload = [
        {
            "StudyID": "FT-9892",
            "PatientAge": "020Y",
            "PatientSex": "F",
            "InstitutionName": "Boston Children's Hospital",
            "StudyDate": "20260227",
            "Modality": "MR",
            "BodyPartExamined": "FETAL",
            "Diagnosis": "Mild ventriculomegaly.",
        }
    ]

    with patch(
        "provider.client.urlopen",
        return_value=_MockResponse(json.dumps(payload).encode()),
    ) as mocked_urlopen:
        mapped = fetch_mapped_studies("http://localhost:8001/")

    mocked_urlopen.assert_called_once_with(
        "http://localhost:8001/api/studies", timeout=5.0
    )
    assert mapped[0]["study_id"] == "FT-9892"
    assert mapped[0]["body_region"] == "fetal"


def test_fetch_studies_rejects_non_list_response():
    with patch(
        "provider.client.urlopen",
        return_value=_MockResponse(b'{"studies": []}'),
    ):
        with pytest.raises(ProviderNodeError):
            fetch_studies("http://localhost:8001")
