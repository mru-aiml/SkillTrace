from fastapi import APIRouter

from app.api.routes import analytics, auth, employers, trainees

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(trainees.router)
api_router.include_router(employers.router)
api_router.include_router(analytics.router)
