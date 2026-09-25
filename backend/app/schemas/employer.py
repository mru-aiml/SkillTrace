from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VerificationDecision(StrEnum):
    VERIFIED = "Verified"
    NEEDS_CORRECTION = "Needs Correction"


class SkillAlignmentFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_alignment: int | None = Field(default=None, ge=1, le=5)
    aligned_skills: list[str] = Field(default_factory=list, max_length=50)
    missing_skills: list[str] = Field(default_factory=list, max_length=50)
    additional_comments: str | None = Field(default=None, max_length=1000)

    @field_validator("aligned_skills", "missing_skills")
    @classmethod
    def normalize_skills(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(item.strip() for item in value if item.strip()))


class VerificationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: VerificationDecision
    role: str | None = Field(default=None, max_length=160)
    company_name: str | None = Field(default=None, max_length=200)
    business_type: str | None = Field(default=None, max_length=120)
    start_date: date | None = None
    wage_value: float | None = Field(default=None, ge=0, le=100_000_000)
    wage_band: str | None = Field(default=None, max_length=80)
    location: str | None = Field(default=None, max_length=200)
    exit_reason: str | None = Field(default=None, max_length=300)
    rating: int | None = Field(default=None, ge=1, le=5)
    skill_alignment_feedback: SkillAlignmentFeedback | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("status", mode="before")
    @classmethod
    def normalise_decision(cls, value: Any) -> Any:
        if isinstance(value, str):
            return {
                "VERIFIED": "Verified",
                "NEEDS_CORRECTION": "Needs Correction",
                "NEEDS CORRECTION": "Needs Correction",
            }.get(value.upper(), value)
        return value


class QueueTrainee(BaseModel):
    name: str
    internal_identifier: str
    district: str


class QueueCourse(BaseModel):
    name: str
    sector: str
    pass_year: int | None


class QueueReported(BaseModel):
    role: str | None
    start_date: date | None
    wage_band: str | None
    location: str | None


class VerificationQueueRow(BaseModel):
    employment_id: UUID
    trainee: QueueTrainee
    course: QueueCourse
    reported: QueueReported
    status: str
    confidence: int
    submitted_at: str
    employer_confirmed: bool


class VerificationPatchResponse(BaseModel):
    employment_id: UUID
    status: str
    employer_confirmed: bool
    verified_at: str | None
    employment: dict[str, Any]
    verification_id: UUID
