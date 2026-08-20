from fastapi import APIRouter
from app.schemas import DashboardStats, RecentActivityEntry
from app.data import dashboard_stats, recent_activity

router = APIRouter()

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    return dashboard_stats

@router.get("/dashboard/recent-activity", response_model=list[RecentActivityEntry])
async def get_recent_activity():
    return recent_activity
