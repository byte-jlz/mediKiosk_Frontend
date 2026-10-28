from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, patients, staff, kiosks, vitals, audit, dashboard, sessions
from app.mqtt_bridge import bridge


@asynccontextmanager
async def lifespan(_app: FastAPI):
    bridge.start()          # listen to the kiosk agents (medikiosk/+/result, /status)
    yield
    bridge.stop()


app = FastAPI(
    title="Medi-Kiosk FastAPI Backend",
    description="Backend API scaffold for the Medi-Kiosk frontend demo.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(patients.router, prefix="/api", tags=["Patients"])
app.include_router(staff.router, prefix="/api", tags=["Staff"])
app.include_router(kiosks.router, prefix="/api", tags=["Kiosks"])
app.include_router(vitals.router, prefix="/api", tags=["Vitals"])
app.include_router(sessions.router, prefix="/api", tags=["Kiosk sessions"])
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
