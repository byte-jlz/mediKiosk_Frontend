from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, patients, staff, kiosks, vitals, audit, dashboard

app = FastAPI(
    title="Medi-Kiosk FastAPI Backend",
    description="Backend API scaffold for the Medi-Kiosk frontend demo.",
    version="0.1.0",
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
app.include_router(audit.router, prefix="/api", tags=["Audit"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
