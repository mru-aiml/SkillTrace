from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select, update

from app.api.deps import CurrentEmployer, CurrentUser, DbSession
from app.core.responses import success
from app.models import (
    EmploymentRecord,
    Followup,
    Trainee,
    TrainingEnrollment,
    VerificationRecord,
)
from app.models.base import utc_now
from app.models.enums import EmploymentStatus, FollowupStatus
from app.schemas.employer import (
    QueueCourse,
    QueueReported,
    QueueTrainee,
    VerificationDecision,
    VerificationPatch,
    VerificationPatchResponse,
    VerificationQueueRow,
)
from app.services.audit import add_audit_log
from app.services.risk import confidence_for_outcome

router = APIRouter(prefix="/employer", tags=["Employer"])


def _wage_band(value: float) -> str:
    if value < 15_000:
        return "Below ₹15k"
    if value < 20_000:
        return "₹15k–₹20k"
    if value < 30_000:
        return "₹20k–₹30k"
    if value < 40_000:
        return "₹30k–₹40k"
    return "₹40k+"


def _latest_enrollment(
    db: DbSession, employment: EmploymentRecord
) -> TrainingEnrollment | None:
    return db.scalar(
        select(TrainingEnrollment)
        .where(TrainingEnrollment.trainee_id == employment.trainee_id)
        .order_by(
            TrainingEnrollment.completed_at.desc().nullslast(),
            TrainingEnrollment.enrolled_at.desc(),
        )
        .limit(1)
    )


@router.get("/verification-queue", response_model=None)
def verification_queue(employer: CurrentEmployer, db: DbSession):
    employments = db.scalars(
        select(EmploymentRecord)
        .join(Trainee, EmploymentRecord.trainee_id == Trainee.id)
        .where(
            EmploymentRecord.employer_id == employer.id,
            Trainee.consent_given.is_(True),
            EmploymentRecord.status.in_(
                [
                    EmploymentStatus.REPORTED,
                    EmploymentStatus.PENDING,
                    EmploymentStatus.NEEDS_CORRECTION,
                ]
            ),
        )
        .order_by(EmploymentRecord.submitted_at.asc())
    ).all()

    rows: list[VerificationQueueRow] = []
    for employment in employments:
        enrollment = _latest_enrollment(db, employment)
        course = enrollment.course if enrollment else None
        proofs = [
            proof
            for proof in employment.trainee.proofs
            if proof.employment_id == employment.id
        ]
        rows.append(
            VerificationQueueRow(
                employment_id=employment.id,
                trainee=QueueTrainee(
                    name=employment.trainee.user.full_name,
                    internal_identifier=employment.trainee.internal_identifier,
                    district=employment.trainee.district,
                ),
                course=QueueCourse(
                    name=course.name if course else "Course not recorded",
                    sector=course.sector if course else "Unknown",
                    pass_year=course.pass_year if course else None,
                ),
                reported=QueueReported(
                    role=employment.role,
                    start_date=employment.start_date,
                    wage_band=employment.wage_band,
                    location=employment.location,
                ),
                status=employment.status.value,
                confidence=confidence_for_outcome(employment, proofs),
                submitted_at=employment.submitted_at.isoformat(),
                employer_confirmed=employment.employer_confirmed_at is not None,
            )
        )
    return success(rows)


@router.patch("/verifications/{employment_id}", response_model=None)
def update_verification(
    employment_id: UUID,
    payload: VerificationPatch,
    request: Request,
    employer: CurrentEmployer,
    current_user: CurrentUser,
    db: DbSession,
):
    employment = db.scalar(
        select(EmploymentRecord)
        .join(Trainee, EmploymentRecord.trainee_id == Trainee.id)
        .where(
            EmploymentRecord.id == employment_id,
            EmploymentRecord.employer_id == employer.id,
            Trainee.consent_given.is_(True),
        )
    )
    if employment is None:
        raise HTTPException(status_code=404, detail="Verification record not found")

    old_status = employment.status.value
    new_status = (
        EmploymentStatus.VERIFIED
        if payload.status == VerificationDecision.VERIFIED
        else EmploymentStatus.NEEDS_CORRECTION
    )
    changed_fields: dict[str, object] = {}
    for field in (
        "role",
        "company_name",
        "business_type",
        "start_date",
        "wage_band",
        "location",
        "exit_reason",
    ):
        if field in payload.model_fields_set and getattr(payload, field) is not None:
            new_value = getattr(payload, field)
            old_value = getattr(employment, field)
            if old_value != new_value:
                changed_fields[field] = {"from": str(old_value), "to": str(new_value)}
            setattr(employment, field, new_value)
    if "wage_value" in payload.model_fields_set:
        changed_fields["wage_value"] = {
            "from": str(employment.wage_value),
            "to": str(payload.wage_value),
        }
        employment.wage_value = (
            Decimal(str(payload.wage_value)) if payload.wage_value is not None else None
        )
        if "wage_band" not in payload.model_fields_set:
            employment.wage_band = (
                _wage_band(float(employment.wage_value))
                if employment.wage_value is not None
                else None
            )

    now = utc_now()
    employment.status = new_status
    employment.employer_confirmed_at = now
    employment.employer_verified_by_id = current_user.id
    if payload.rating is not None:
        employment.rating = payload.rating
    if payload.skill_alignment_feedback is not None:
        employment.skill_alignment_feedback = (
            payload.skill_alignment_feedback.model_dump()
        )
    employment.correction_notes = payload.notes

    verification = VerificationRecord(
        employment_id=employment.id,
        verifier_id=current_user.id,
        status=new_status,
        rating=payload.rating,
        skill_alignment_feedback=(
            payload.skill_alignment_feedback.model_dump()
            if payload.skill_alignment_feedback
            else None
        ),
        notes=payload.notes,
        evidence={"corrections": changed_fields},
        verified_at=now,
    )
    db.add(verification)
    db.flush()

    # A correction unlocks the next scheduled trainee follow-up.
    if new_status == EmploymentStatus.NEEDS_CORRECTION:
        db.execute(
            update(Followup)
            .where(
                Followup.employment_id == employment.id,
                Followup.status == FollowupStatus.SCHEDULED,
            )
            .values(
                status=FollowupStatus.SCHEDULED,
                contact_method="PHONE",
                notes="Employer requested outcome correction",
                updated_at=now,
            )
        )

    add_audit_log(
        db,
        actor_id=current_user.id,
        action="EMPLOYMENT_VERIFICATION_UPDATED",
        entity_type="employment_record",
        entity_id=employment.id,
        details={
            "employer_id": str(employer.id),
            "from_status": old_status,
            "to_status": new_status.value,
            "rating": payload.rating,
            "corrections": changed_fields,
        },
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(employment)
    db.refresh(verification)

    response = VerificationPatchResponse(
        employment_id=employment.id,
        status=employment.status.value,
        employer_confirmed=employment.employer_confirmed_at is not None,
        verified_at=now.isoformat(),
        employment={
            "outcome_type": employment.outcome_type.value,
            "role": employment.role,
            "company_name": employment.company_name,
            "business_type": employment.business_type,
            "start_date": employment.start_date,
            "wage_value": float(employment.wage_value)
            if employment.wage_value is not None
            else None,
            "wage_band": employment.wage_band,
            "location": employment.location,
            "exit_reason": employment.exit_reason,
            "rating": employment.rating,
            "skill_alignment_feedback": employment.skill_alignment_feedback,
        },
        verification_id=verification.id,
    )
    return success(response)
