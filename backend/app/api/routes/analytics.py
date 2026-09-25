from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentAdmin, DbSession
from app.core.config import get_settings
from app.core.responses import success
from app.services.analytics import (
    AnalyticsFilters,
    AnalyticsService,
    resolve_date_range,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def analytics_filters(
    period: Annotated[
        str | None,
        Query(description="Relative period such as 30d, 90d, or 12m", max_length=16),
    ] = None,
    district: Annotated[str | None, Query(max_length=100)] = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> AnalyticsFilters:
    filters = AnalyticsFilters(
        period=period,
        district=district.strip() if district else None,
        start_date=start_date,
        end_date=end_date,
    )
    try:
        # Resolve during dependency processing so malformed filters consistently
        # return the standard API error envelope.
        resolve_date_range(filters)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return filters


AnalyticsFilterDependency = Annotated[AnalyticsFilters, Depends(analytics_filters)]


def _service(db: DbSession, filters: AnalyticsFilters) -> AnalyticsService:
    return AnalyticsService(db, filters, get_settings().province)


@router.get("/overview", response_model=None)
def overview(
    db: DbSession,
    current_admin: CurrentAdmin,
    filters: AnalyticsFilterDependency,
):
    return success(_service(db, filters).overview())


@router.get("/districts", response_model=None)
def districts(
    db: DbSession,
    current_admin: CurrentAdmin,
    filters: AnalyticsFilterDependency,
):
    return success(_service(db, filters).districts())


@router.get("/funnel", response_model=None)
def funnel(
    db: DbSession,
    current_admin: CurrentAdmin,
    filters: AnalyticsFilterDependency,
):
    return success(_service(db, filters).funnel())


@router.get("/skill-gaps", response_model=None)
def skill_gaps(
    db: DbSession,
    current_admin: CurrentAdmin,
    filters: AnalyticsFilterDependency,
):
    return success(_service(db, filters).skill_gaps())


@router.get("/attrition", response_model=None)
def attrition(
    db: DbSession,
    current_admin: CurrentAdmin,
    filters: AnalyticsFilterDependency,
):
    return success(_service(db, filters).attrition())


@router.get("/insights", response_model=None)
def insights(
    db: DbSession,
    current_admin: CurrentAdmin,
    filters: AnalyticsFilterDependency,
):
    return success(_service(db, filters).insights())
