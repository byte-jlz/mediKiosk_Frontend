from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, patients, staff, kiosks, vitals, audit, dashboard, sessions
from app.mqtt_bridge import bridge
from app.security import CLINIC_STAFF, SUPER_ADMIN, require_roles


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

# Who may call what (use-case diagrams, Figures 3.4 / 3.5). Routes inside
# sessions.py and staff.py also check roles themselves.
admin_only = [Depends(require_roles(SUPER_ADMIN))]
any_staff = [Depends(require_roles(SUPER_ADMIN, CLINIC_STAFF))]

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(patients.router, prefix="/api", tags=["Patients"], dependencies=any_staff)
app.include_router(staff.router, prefix="/api", tags=["Staff"])                  # Super Admin (in staff.py)
app.include_router(kiosks.router, prefix="/api", tags=["Kiosks"], dependencies=admin_only)
app.include_router(vitals.router, prefix="/api", tags=["Vitals"])                # phone app (patient login comes later)
app.include_router(sessions.router, prefix="/api", tags=["Kiosk sessions"])      # kiosk routes open, /admin routes locked
app.include_router(audit.router, prefix="/api", tags=["Audit"], dependencies=admin_only)
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"], dependencies=admin_only)
