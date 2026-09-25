from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    TRAINEE = "TRAINEE"
    EMPLOYER = "EMPLOYER"
    GOVERNMENT_ADMIN = "GOVERNMENT_ADMIN"


class EnrollmentStatus(StrEnum):
    ENROLLED = "ENROLLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    WITHDRAWN = "WITHDRAWN"


class OutcomeType(StrEnum):
    EMPLOYED = "EMPLOYED"
    SELF_EMPLOYED = "SELF_EMPLOYED"
    APPRENTICESHIP = "APPRENTICESHIP"
    SEEKING_JOB = "SEEKING_JOB"


class EmploymentStatus(StrEnum):
    REPORTED = "REPORTED"
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"
    REJECTED = "REJECTED"


class ProofStatus(StrEnum):
    UPLOADED = "UPLOADED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class FollowupStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DemandStatus(StrEnum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
