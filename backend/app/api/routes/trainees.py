from __future__ import annotations

import hashlib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select

from app.api.deps import CurrentTrainee, DbSession
from app.core.config import get_settings
from app.core.responses import success
from app.models import EmploymentRecord, Proof, TrainingEnrollment
from app.models.base import utc_now
from app.models.enums import FollowupStatus, OutcomeType, ProofStatus
from app.schemas.trainee import (
    OutcomeRequest,
    OutcomeSummary,
    PassportResponse,
    ProofResponse,
    RetentionMilestone,
    RetentionSummary,
    TraineeProfile,
    TrainingSummary,
    WageProgressionPoint,
)
from app.services.audit import add_audit_log
from app.services.outcomes import save_outcome
from app.services.risk import (
    calculate_risk,
    calculate_skill_relevance,
    confidence_for_outcome,
)

router = APIRouter(prefix="/trainees/me", tags=["Trainee"])

ALLOWED_PROOFS: dict[str, tuple[str, ...]] = {
    ".pdf": ("application/pdf",),
    ".png": ("image/png",),
    ".jpg": ("image/jpeg",),
    ".jpeg": ("image/jpeg",),
}


def _latest_enrollment(db: DbSession, trainee_id: UUID) -> TrainingEnrollment | None:
    return db.scalar(
        select(TrainingEnrollment)
        .where(TrainingEnrollment.trainee_id == trainee_id)
        .order_by(
            TrainingEnrollment.completed_at.desc().nullslast(),
            TrainingEnrollment.enrolled_at.desc(),
        )
        .limit(1)
    )


def _current_outcome(db: DbSession, trainee_id: UUID) -> EmploymentRecord | None:
    return db.scalar(
        select(EmploymentRecord)
        .where(EmploymentRecord.trainee_id == trainee_id)
        .order_by(
            EmploymentRecord.is_current.desc(),
            EmploymentRecord.submitted_at.desc(),
        )
        .limit(1)
    )


@router.get("/passport", response_model=None)
def get_passport(trainee: CurrentTrainee, db: DbSession):
    enrollment = _latest_enrollment(db, trainee.id)
    employment = _current_outcome(db, trainee.id)
    risk = calculate_risk(db, trainee, enrollment, employment)
    proofs = sorted(trainee.proofs, key=lambda item: item.uploaded_at, reverse=True)
    outcome_proofs = [
        proof
        for proof in proofs
        if employment is not None and proof.employment_id == employment.id
    ]
    confidence = confidence_for_outcome(employment, outcome_proofs)
    today = datetime.now(UTC).date()

    if employment and employment.start_date:
        months_in_role = max(
            0,
            (today.year - employment.start_date.year) * 12
            + today.month
            - employment.start_date.month,
        )
    else:
        months_in_role = 0

    completed_followups = [
        item for item in trainee.followups if item.status == FollowupStatus.COMPLETED
    ]
    upcoming = sorted(
        (
            item
            for item in trainee.followups
            if item.status == FollowupStatus.SCHEDULED and item.scheduled_for >= today
        ),
        key=lambda item: item.scheduled_for,
    )
    next_followup = upcoming[0] if upcoming else None
    is_retained = bool(
        employment
        and employment.is_current
        and employment.outcome_type
        in {OutcomeType.EMPLOYED, OutcomeType.APPRENTICESHIP}
    )
    latest_proof_status = (
        outcome_proofs[0].status.value
        if outcome_proofs
        else proofs[0].status.value
        if proofs and employment is None
        else "NOT_PROVIDED"
    )

    training_summary = None
    if enrollment:
        training_summary = TrainingSummary(
            id=enrollment.course.id,
            course_name=enrollment.course.name,
            course_code=enrollment.course.course_code,
            sector=enrollment.course.sector,
            institution=enrollment.course.institution_name,
            district=enrollment.course.district,
            duration_weeks=enrollment.course.duration_weeks,
            training_hours=enrollment.course.training_hours,
            taught_skills=enrollment.course.taught_skills,
            enrollment_status=enrollment.status.value,
            pass_year=enrollment.course.pass_year,
            completed_at=enrollment.completed_at,
            final_score=enrollment.final_score,
            certificate_number=enrollment.certificate_number,
        )

    history = sorted(
        trainee.employments,
        key=lambda item: (item.start_date or date.min, item.submitted_at),
    )
    last_updated_candidates = [
        trainee.updated_at,
        employment.updated_at if employment else None,
        enrollment.updated_at if enrollment else None,
        next_followup.updated_at if next_followup else None,
    ]
    last_updated = max(item for item in last_updated_candidates if item is not None)

    retention_milestones: list[RetentionMilestone] = []
    if employment and employment.start_date and employment.outcome_type in {
        OutcomeType.EMPLOYED,
        OutcomeType.APPRENTICESHIP,
        OutcomeType.SELF_EMPLOYED,
    }:
        for label, days in (("3M", 90), ("6M", 180), ("12M", 365)):
            due_date = employment.start_date + timedelta(days=days)
            if months_in_role >= days // 30:
                status = "RETAINED" if is_retained else "EXITED"
                evidence = (
                    "Current active outcome"
                    if is_retained
                    else employment.correction_notes or "Outcome history recorded"
                )
            elif months_in_role > 0:
                status = "IN_PROGRESS"
                evidence = f"{months_in_role} months in current outcome"
            else:
                status = "UPCOMING"
                evidence = "Outcome has just been reported"
            retention_milestones.append(
                RetentionMilestone(
                    label=label,
                    status=status,
                    due_date=due_date,
                    evidence_date=today if months_in_role > 0 else None,
                    evidence=evidence,
                )
            )

    response = PassportResponse(
        trainee=TraineeProfile(
            id=trainee.id,
            full_name=trainee.user.full_name,
            email=trainee.user.email,
            phone=trainee.user.phone,
            internal_identifier=trainee.internal_identifier,
            district=trainee.district,
            state=trainee.state,
            address=trainee.address,
            latitude=trainee.latitude,
            longitude=trainee.longitude,
            consent_given=trainee.consent_given,
            data_processing_allowed=trainee.data_processing_allowed,
        ),
        training=training_summary,
        current_outcome=OutcomeSummary.model_validate(employment, from_attributes=True)
        if employment
        else None,
        confidence_score=confidence,
        confidence_label="High" if confidence == 95 else "Medium",
        skill_relevance_score=calculate_skill_relevance(db, enrollment, employment),
        risk_level=str(risk["level"]),
        risk_reasons=list(risk["reasons"]),  # type: ignore[arg-type]
        retention=RetentionSummary(
            status=(
                "EMPLOYED"
                if is_retained
                else "NOT_RETAINED"
                if employment and not employment.is_current
                else "UNEMPLOYED"
                if employment and employment.outcome_type == OutcomeType.SEEKING_JOB
                else "OUTCOME_PENDING"
            ),
            is_retained=is_retained,
            months_in_role=months_in_role,
            eligible_for_6m=months_in_role >= 6,
            followup_count=len(completed_followups),
            last_followup_date=(
                max(item.scheduled_for for item in completed_followups)
                if completed_followups
                else None
            ),
            next_followup_date=next_followup.scheduled_for if next_followup else None,
        ),
        retention_milestones=retention_milestones,
        wage_progression=[
            WageProgressionPoint(
                employment_id=item.id,
                start_date=item.start_date,
                ended_at=item.ended_at,
                wage_value=float(item.wage_value)
                if item.wage_value is not None
                else None,
                wage_band=item.wage_band,
                outcome_type=item.outcome_type,
            )
            for item in history
        ],
        next_followup=next_followup.scheduled_for if next_followup else None,
        proof_status=latest_proof_status,
        last_updated=last_updated,
    )
    return success(response)


def _save_outcome(
    trainee: CurrentTrainee,
    actor_id: UUID,
    db: DbSession,
    payload: OutcomeRequest,
    request: Request,
    employment: EmploymentRecord | None,
):
    try:
        record = save_outcome(
            db,
            trainee,
            actor_id,
            payload,
            employment=employment,
            ip_address=request.client.host if request.client else None,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    outcome = OutcomeSummary.model_validate(record, from_attributes=True)
    return success(outcome, status_code=200 if employment is not None else 201)


@router.post("/outcomes", response_model=None)
def create_outcome(
    payload: OutcomeRequest,
    request: Request,
    trainee: CurrentTrainee,
    db: DbSession,
):
    return _save_outcome(trainee, trainee.user_id, db, payload, request, None)


@router.patch("/outcomes/{employment_id}", response_model=None)
def update_outcome(
    employment_id: UUID,
    payload: OutcomeRequest,
    request: Request,
    trainee: CurrentTrainee,
    db: DbSession,
):
    employment = db.scalar(
        select(EmploymentRecord).where(EmploymentRecord.id == employment_id)
    )
    if employment is None or employment.trainee_id != trainee.id:
        raise HTTPException(status_code=404, detail="Outcome not found")
    return _save_outcome(trainee, trainee.user_id, db, payload, request, employment)


def _valid_signature(extension: str, header: bytes) -> bool:
    if extension == ".pdf":
        return header.startswith(b"%PDF-")
    if extension == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if extension in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    return False


@router.post("/proofs", response_model=None)
async def upload_proof(
    request: Request,
    trainee: CurrentTrainee,
    db: DbSession,
    file: Annotated[UploadFile, File()],
    description: Annotated[str | None, Form(max_length=500)] = None,
    employment_id: Annotated[UUID | None, Form()] = None,
):
    original_name = (file.filename or "").replace("\\", "/").split("/")[-1].strip()
    extension = Path(original_name).suffix.casefold()
    if not original_name or extension not in ALLOWED_PROOFS:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Proof must be a PDF, PNG, JPG, or JPEG file",
        )

    employment = None
    if employment_id is not None:
        employment = db.scalar(
            select(EmploymentRecord).where(EmploymentRecord.id == employment_id)
        )
        if employment is None or employment.trainee_id != trainee.id:
            await file.close()
            raise HTTPException(status_code=404, detail="Outcome not found")

    settings = get_settings()
    max_size = min(settings.max_upload_size, 50 * 1024 * 1024)
    header = file.file.read(16)
    file.file.seek(0)
    if not header or not _valid_signature(extension, header):
        await file.close()
        raise HTTPException(
            status_code=400, detail="File content does not match its extension"
        )

    stored_filename = f"{uuid4().hex}{extension}"
    destination = settings.resolved_upload_dir / stored_filename
    settings.resolved_upload_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    file_size = 0
    try:
        with destination.open("xb") as output:
            while chunk := file.file.read(64 * 1024):
                file_size += len(chunk)
                if file_size > max_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Proof file exceeds the {max_size // (1024 * 1024)} MB limit",
                    )
                digest.update(chunk)
                output.write(chunk)
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Proof file is empty")

        proof = Proof(
            trainee_id=trainee.id,
            employment_id=employment.id if employment else None,
            original_filename=original_name,
            stored_filename=stored_filename,
            storage_path=f"uploads/{stored_filename}",
            mime_type=ALLOWED_PROOFS[extension][0],
            file_size=file_size,
            sha256=digest.hexdigest(),
            status=ProofStatus.UPLOADED,
            description=description.strip() if description else None,
            uploaded_at=utc_now(),
        )
        db.add(proof)
        db.flush()
        proof_response = ProofResponse.model_validate(proof)
        add_audit_log(
            db,
            actor_id=trainee.user_id,
            action="PROOF_UPLOADED",
            entity_type="proof",
            entity_id=proof.id,
            details={"filename": original_name, "file_size": file_size},
            ip_address=request.client.host if request.client else None,
        )
        db.commit()
        db.refresh(proof)
        return success(proof_response, status_code=201)
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
