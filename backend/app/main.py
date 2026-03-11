from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, shops, members, entries, rates, bills, payments, dashboard, profile, export
from .config import settings

app = FastAPI(title="Flower Billing API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(shops.router, prefix="/api/shops", tags=["shops"])
app.include_router(members.router, prefix="/api/members", tags=["members"])
app.include_router(entries.router, prefix="/api/entries", tags=["entries"])
app.include_router(rates.router, prefix="/api/rates", tags=["rates"])
app.include_router(bills.router, prefix="/api/bills", tags=["bills"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(export.router, prefix="/api/export", tags=["export"])

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Welcome to Flower Billing API", "docs": "/docs"}
