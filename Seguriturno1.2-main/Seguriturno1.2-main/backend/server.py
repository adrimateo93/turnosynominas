from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'seguriturno-secret-key-2026')
JWT_ALGORITHM = "HS256"

app = FastAPI(title="SeguriTurno API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Spanish National Holidays 2026
SPANISH_HOLIDAYS_2026 = [
    "2026-01-01",  # Año Nuevo
    "2026-01-06",  # Epifanía del Señor
    "2026-04-02",  # Jueves Santo
    "2026-04-03",  # Viernes Santo
    "2026-05-01",  # Fiesta del Trabajo
    "2026-08-15",  # Asunción de la Virgen
    "2026-10-12",  # Fiesta Nacional de España
    "2026-11-02",  # Día de Todos los Santos (trasladado)
    "2026-12-07",  # Día de la Constitución (trasladado)
    "2026-12-08",  # Inmaculada Concepción
    "2026-12-25",  # Navidad
]

# Salary Tables 2026 - Private Security Collective Agreement
SALARY_TABLES_2026 = {
    "vigilante_sin_arma": {
        "name": "Vigilante de Seguridad Sin Arma",
        "salario_base": 1161.28,
        "plus_peligrosidad": 24.08,
        "plus_actividad": 0,
        "plus_transporte": 137.81,
        "plus_vestuario": 112.28,
        "salario_total": 1435.45,
        "trienio": 25.51,
        "quinquenio": 45.85,
        "nocturnidad_hora": 1.25
    },
    "vigilante_con_arma": {
        "name": "Vigilante de Seguridad Con Arma",
        "salario_base": 1161.28,
        "plus_peligrosidad": 179.90,
        "plus_actividad": 0,
        "plus_transporte": 137.81,
        "plus_vestuario": 112.28,
        "salario_total": 1591.27,
        "trienio": 25.51,
        "quinquenio": 45.85,
        "nocturnidad_hora": 1.25
    },
    "vigilante_transporte_conductor": {
        "name": "V.S. Transporte - Conductor",
        "salario_base": 1285.56,
        "plus_peligrosidad": 179.90,
        "plus_actividad": 210.20,
        "plus_transporte": 137.81,
        "plus_vestuario": 114.55,
        "salario_total": 1928.01,
        "trienio": 27.61,
        "quinquenio": 50.23,
        "nocturnidad_hora": 1.36
    },
    "vigilante_transporte": {
        "name": "V.S. Transporte",
        "salario_base": 1227.74,
        "plus_peligrosidad": 179.90,
        "plus_actividad": 210.20,
        "plus_transporte": 137.81,
        "plus_vestuario": 113.27,
        "salario_total": 1868.91,
        "trienio": 25.61,
        "quinquenio": 46.58,
        "nocturnidad_hora": 1.26
    },
    "vigilante_explosivos_conductor": {
        "name": "V.S.T. Explosivos Conductor",
        "salario_base": 1285.56,
        "plus_peligrosidad": 191.59,
        "plus_actividad": 152.44,
        "plus_transporte": 137.81,
        "plus_vestuario": 114.55,
        "salario_total": 1881.94,
        "trienio": 27.61,
        "quinquenio": 50.23,
        "nocturnidad_hora": 1.36
    },
    "vigilante_explosivos": {
        "name": "V.S. Transp - Explosivos",
        "salario_base": 1227.74,
        "plus_peligrosidad": 191.59,
        "plus_actividad": 152.44,
        "plus_transporte": 137.81,
        "plus_vestuario": 113.27,
        "salario_total": 1822.85,
        "trienio": 25.61,
        "quinquenio": 46.58,
        "nocturnidad_hora": 1.26
    },
    "vigilante_seguridad_explosivos": {
        "name": "V.S. Explosivos",
        "salario_base": 1161.28,
        "plus_peligrosidad": 210.56,
        "plus_actividad": 40.17,
        "plus_transporte": 137.81,
        "plus_vestuario": 112.24,
        "salario_total": 1662.06,
        "trienio": 25.51,
        "quinquenio": 45.85,
        "nocturnidad_hora": 1.25
    },
    "escolta": {
        "name": "Escolta",
        "salario_base": 1161.28,
        "plus_peligrosidad": 177.15,
        "plus_actividad": 0,
        "plus_transporte": 137.81,
        "plus_vestuario": 115.66,
        "salario_total": 1591.90,
        "trienio": 0,
        "quinquenio": 45.85,
        "nocturnidad_hora": 1.25
    },
    "operador_seguridad": {
        "name": "Operador de Seguridad",
        "salario_base": 1091.57,
        "plus_peligrosidad": 0,
        "plus_actividad": 0,
        "plus_transporte": 137.81,
        "plus_vestuario": 68.53,
        "salario_total": 1297.92,
        "trienio": 21.28,
        "quinquenio": 38.73,
        "nocturnidad_hora": 0.99
    },
    "contador_pagador": {
        "name": "Contador - Pagador",
        "salario_base": 1078.17,
        "plus_peligrosidad": 0,
        "plus_actividad": 80.32,
        "plus_transporte": 137.81,
        "plus_vestuario": 72.84,
        "salario_total": 1369.14,
        "trienio": 21.28,
        "quinquenio": 38.73,
        "nocturnidad_hora": 1.06
    }
}

# Other rates
PLUS_FESTIVO_HORA = 1.02
PLUS_RESPONSABLE_EQUIPO_PERCENT = 0.10

# Pluses del Convenio 2026
PLUS_KILOMETRAJE = 0.35
PLUS_AEROPUERTO_HORA = 0.82
PLUS_RADIOSCOPIA_AEROPORTUARIA_HORA = 1.46
PLUS_FILTRO_ROTACION_HORA = 0.74
PLUS_RADIOSCOPIA_BASICA_HORA = 0.21
PLUS_RADIOSCOPIA_BASICA_TOPE = 236.52
PLUS_ESCOLTA_HORA = 1.93
PLUS_NOCHEBUENA_NOCHEVIEJA = 83.48
PLUS_HIJO_DISCAPACITADO = 150.70

# Precio base de hora extra/asistencia juicio por categoría (sin antigüedad)
# Calculado como: (Salario Base + Peligrosidad Básica) / 162h
PRECIO_HORA_ASISTENCIA_JUICIO = {
    "vigilante_sin_arma": 9.98,
    "vigilante_con_arma": 11.28,  # Según usuario: 11,28 más antigüedad
    "guarda_rural": 11.28,
    "escolta": 11.13,
    "vigilante_explosivos": 11.55,
    "vigilante_transporte_explosivos": 12.18,
    "vigilante_transporte": 11.84,
    "vigilante_transporte_conductor": 12.52,
    "operador_seguridad": 9.07,
    "contador_pagador": 8.96
}
PLUS_KILOMETRAJE = 0.35
PLUS_RADIOSCOPIA_BASICA = 0.21
PLUS_ESCOLTA_HORA = 1.93
PLUS_NOCHEBUENA_NOCHEVIEJA = 83.48
PLUS_AEROPUERTO_HORA = 0.82
PLUS_RADIOSCOPIA_AEROPORTUARIA = 1.46

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class UserSettings(BaseModel):
    categoria: str = "vigilante_sin_arma"
    porcentaje_jornada: int = 100
    trienios: int = 0
    quinquenios: int = 0
    es_responsable_equipo: bool = False
    # Jornada 100% = 1782 horas/año / 11 meses = 162 horas/mes base
    horas_anuales: float = 1782
    meses_trabajo: int = 11  # 1 mes vacaciones
    # Pagas extras y fiscalidad
    pagas_prorrateadas: bool = True  # True = prorrateadas, False = íntegras (marzo, julio, diciembre)
    tipo_contrato: str = "indefinido"  # indefinido o temporal
    irpf_porcentaje: float = 15.0  # IRPF personalizable
    horas_extra_fuerza_mayor: bool = False  # True = 2%, False = 4.70%
    # Pluses específicos del servicio
    plus_servicio_nombre: str = ""  # Nombre del plus (ej: "Plus Aeropuerto", "Plus Cliente X")
    plus_servicio_importe: float = 0.0  # Importe mensual personalizado

class UserSettingsUpdate(BaseModel):
    categoria: Optional[str] = None
    porcentaje_jornada: Optional[int] = None
    trienios: Optional[int] = None
    quinquenios: Optional[int] = None
    ano_entrada_empresa: Optional[int] = None
    es_responsable_equipo: Optional[bool] = None
    horas_anuales: Optional[float] = None
    meses_trabajo: Optional[int] = None
    pagas_prorrateadas: Optional[bool] = None
    tipo_contrato: Optional[str] = None
    irpf_porcentaje: Optional[float] = None
    horas_extra_fuerza_mayor: Optional[bool] = None
    plus_servicio_nombre: Optional[str] = None
    plus_servicio_importe: Optional[float] = None
    # Pluses del Convenio
    plus_kilometraje_km: Optional[float] = None
    plus_aeropuerto_horas: Optional[float] = None
    plus_radioscopia_aeroportuaria_horas: Optional[float] = None
    plus_filtro_rotacion_horas: Optional[float] = None
    plus_radioscopia_basica_horas: Optional[float] = None
    plus_escolta_horas: Optional[float] = None
    plus_nochebuena: Optional[bool] = None
    plus_nochevieja: Optional[bool] = None
    plus_hijo_discapacitado: Optional[bool] = None
    plus_asistencia_juicio_horas: Optional[float] = None
    # Dietas
    dieta_una_comida: Optional[int] = None
    dieta_dos_comidas: Optional[int] = None
    dieta_pernocta_desayuno: Optional[int] = None
    dieta_pernocta_dos_comidas: Optional[int] = None
    dieta_completa_8_dia: Optional[int] = None

class ShiftCreate(BaseModel):
    date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str  # HH:MM
    start_time_2: Optional[str] = None  # HH:MM - segundo turno (turno partido)
    end_time_2: Optional[str] = None  # HH:MM - segundo turno
    overtime_hours: float = 0
    color: str = "#10B981"
    comment: str = ""
    alarm_enabled: bool = False
    shift_type: str = "normal"  # normal, permiso_retribuido, incapacidad_temporal, accidente_trabajo
    symbol: str = ""  # Símbolo personalizado para la casilla
    label: str = ""  # Etiqueta corta para mostrar en calendario (ej: M, T, N, 1, 2)
    company_id: int = 1  # 1 = Empresa A, 2 = Empresa B

class ShiftUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_time_2: Optional[str] = None
    end_time_2: Optional[str] = None
    overtime_hours: Optional[float] = None
    color: Optional[str] = None
    comment: Optional[str] = None
    alarm_enabled: Optional[bool] = None
    shift_type: Optional[str] = None
    symbol: Optional[str] = None
    label: Optional[str] = None
    company_id: Optional[int] = None

class ShiftResponse(BaseModel):
    id: str
    user_id: str
    date: str
    start_time: str
    end_time: str
    start_time_2: Optional[str] = None
    end_time_2: Optional[str] = None
    overtime_hours: float
    color: str
    comment: str
    alarm_enabled: bool
    shift_type: str
    symbol: str = ""
    label: str = ""
    company_id: int = 1
    total_hours: float
    night_hours: float
    holiday_hours: float
    created_at: str

# Custom Shift Templates (Plantillas de turno personalizadas)
class ShiftTemplateCreate(BaseModel):
    name: str  # Nombre de la plantilla (ej: "Mañana", "Tarde", "Noche")
    start_time: str
    end_time: str
    start_time_2: Optional[str] = None
    end_time_2: Optional[str] = None
    color: str = "#10B981"
    symbol: str = ""
    label: str = ""

class ShiftTemplateUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_time_2: Optional[str] = None
    end_time_2: Optional[str] = None
    color: Optional[str] = None
    symbol: Optional[str] = None
    label: Optional[str] = None

# Company Settings (Configuración de empresas)
class CompanyCreate(BaseModel):
    name: str
    company_number: int  # 1, 2 o 3

class CompanyUpdate(BaseModel):
    name: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_night_hours(start_time: str, end_time: str, shift_date: str) -> float:
    """Calculate night hours (22:00 - 06:00)"""
    start_h, start_m = map(int, start_time.split(':'))
    end_h, end_m = map(int, end_time.split(':'))
    
    start_minutes = start_h * 60 + start_m
    end_minutes = end_h * 60 + end_m
    
    # Handle overnight shifts
    if end_minutes <= start_minutes:
        end_minutes += 24 * 60
    
    night_start = 22 * 60  # 22:00
    night_end = 6 * 60  # 06:00
    night_end_next_day = 30 * 60  # 06:00 next day (6 + 24)
    
    night_minutes = 0
    
    # Check overlap with night period (22:00 - 24:00)
    if start_minutes < 24 * 60 and end_minutes > night_start:
        overlap_start = max(start_minutes, night_start)
        overlap_end = min(end_minutes, 24 * 60)
        if overlap_end > overlap_start:
            night_minutes += overlap_end - overlap_start
    
    # Check overlap with night period (00:00 - 06:00)
    if start_minutes < night_end:
        overlap_start = max(start_minutes, 0)
        overlap_end = min(end_minutes, night_end)
        if overlap_end > overlap_start:
            night_minutes += overlap_end - overlap_start
    
    # Check overlap with night period next day (00:00 - 06:00 for overnight shifts)
    if end_minutes > 24 * 60:
        overlap_start = max(start_minutes, 24 * 60)
        overlap_end = min(end_minutes, night_end_next_day)
        if overlap_end > overlap_start:
            night_minutes += overlap_end - overlap_start
    
    return round(night_minutes / 60, 2)

def is_holiday(date_str: str) -> bool:
    """Check if date is a holiday (weekend or national holiday)"""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    # Weekend (Saturday=5, Sunday=6)
    if d.weekday() >= 5:
        return True
    # National holiday
    if date_str in SPANISH_HOLIDAYS_2026:
        return True
    return False

def calculate_total_hours(start_time: str, end_time: str) -> float:
    """Calculate total shift hours"""
    start_h, start_m = map(int, start_time.split(':'))
    end_h, end_m = map(int, end_time.split(':'))
    
    start_minutes = start_h * 60 + start_m
    end_minutes = end_h * 60 + end_m
    
    # Handle overnight shifts
    if end_minutes <= start_minutes:
        end_minutes += 24 * 60
    
    return round((end_minutes - start_minutes) / 60, 2)

# Root route
@api_router.get("/")
async def root():
    return {"message": "SeguriTurno API v1.0", "status": "ok"}

# Auth Routes
@api_router.post("/auth/register", response_model=dict)
async def register(user: UserRegister):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "password": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create default settings
    settings_doc = {
        "user_id": user_id,
        "categoria": "vigilante_sin_arma",
        "porcentaje_jornada": 100,
        "trienios": 0,
        "quinquenios": 0,
        "es_responsable_equipo": False,
        "horas_anuales": 1782,
        "meses_trabajo": 11,
        "pagas_prorrateadas": True,
        "tipo_contrato": "indefinido",
        "irpf_porcentaje": 15.0,
        "horas_extra_fuerza_mayor": False,
        "plus_servicio_nombre": "",
        "plus_servicio_importe": 0.0
    }
    await db.user_settings.insert_one(settings_doc)
    
    return {"token": create_token(user_id), "user": {"id": user_id, "email": user.email, "name": user.name}}

@api_router.post("/auth/login", response_model=dict)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "token": create_token(db_user["id"]),
        "user": {"id": db_user["id"], "email": db_user["email"], "name": db_user["name"]}
    }

@api_router.get("/auth/me", response_model=dict)
async def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"]}

# Settings Routes
@api_router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    settings = await db.user_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        settings = {
            "user_id": user["id"],
            "categoria": "vigilante_sin_arma",
            "porcentaje_jornada": 100,
            "trienios": 0,
            "quinquenios": 0,
            "es_responsable_equipo": False,
            "horas_anuales": 1782,
            "meses_trabajo": 11,
            "pagas_prorrateadas": True,
            "tipo_contrato": "indefinido",
            "irpf_porcentaje": 15.0,
            "horas_extra_fuerza_mayor": False
        }
        await db.user_settings.insert_one(settings)
    # Migration: update old settings format
    if "horas_jornada_completa" in settings:
        settings["horas_anuales"] = 1782
        settings["meses_trabajo"] = 11
        settings.pop("horas_jornada_completa", None)
    # Add default values for new fields if missing
    if "pagas_prorrateadas" not in settings:
        settings["pagas_prorrateadas"] = True
    if "tipo_contrato" not in settings:
        settings["tipo_contrato"] = "indefinido"
    if "irpf_porcentaje" not in settings:
        settings["irpf_porcentaje"] = 15.0
    if "horas_extra_fuerza_mayor" not in settings:
        settings["horas_extra_fuerza_mayor"] = False
    if "plus_servicio_nombre" not in settings:
        settings["plus_servicio_nombre"] = ""
    if "plus_servicio_importe" not in settings:
        settings["plus_servicio_importe"] = 0.0
    return settings

@api_router.put("/settings")
async def update_settings(settings: UserSettingsUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    if update_data:
        await db.user_settings.update_one(
            {"user_id": user["id"]},
            {"$set": update_data},
            upsert=True
        )
    updated = await db.user_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    return updated

# Shifts Routes
@api_router.post("/shifts", response_model=ShiftResponse)
async def create_shift(shift: ShiftCreate, user=Depends(get_current_user)):
    shift_id = str(uuid.uuid4())
    
    # Calcular horas del primer turno
    total_hours = calculate_total_hours(shift.start_time, shift.end_time)
    night_hours = calculate_night_hours(shift.start_time, shift.end_time, shift.date)
    
    # Si hay turno partido, añadir las horas del segundo turno
    if shift.start_time_2 and shift.end_time_2:
        total_hours += calculate_total_hours(shift.start_time_2, shift.end_time_2)
        night_hours += calculate_night_hours(shift.start_time_2, shift.end_time_2, shift.date)
    
    holiday_hours = total_hours if is_holiday(shift.date) else 0
    
    shift_doc = {
        "id": shift_id,
        "user_id": user["id"],
        "date": shift.date,
        "start_time": shift.start_time,
        "end_time": shift.end_time,
        "start_time_2": shift.start_time_2,
        "end_time_2": shift.end_time_2,
        "overtime_hours": shift.overtime_hours,
        "color": shift.color,
        "comment": shift.comment,
        "alarm_enabled": shift.alarm_enabled,
        "shift_type": shift.shift_type,
        "symbol": shift.symbol,
        "company_id": shift.company_id,
        "total_hours": total_hours,
        "night_hours": night_hours,
        "holiday_hours": holiday_hours,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shifts.insert_one(shift_doc)
    shift_doc.pop("_id", None)
    return shift_doc

@api_router.get("/shifts")
async def get_shifts(month: Optional[int] = None, year: Optional[int] = None, company_id: Optional[int] = None, user=Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if month and year:
        month_str = f"{year}-{str(month).zfill(2)}"
        query["date"] = {"$regex": f"^{month_str}"}
    if company_id:
        query["company_id"] = company_id
    
    shifts = await db.shifts.find(query, {"_id": 0}).to_list(1000)
    
    # Add default values for new fields if missing (migration)
    for shift in shifts:
        if "start_time_2" not in shift:
            shift["start_time_2"] = None
        if "end_time_2" not in shift:
            shift["end_time_2"] = None
        if "symbol" not in shift:
            shift["symbol"] = ""
        if "company_id" not in shift:
            shift["company_id"] = 1
    
    return shifts

@api_router.get("/shifts/{shift_id}")
async def get_shift(shift_id: str, user=Depends(get_current_user)):
    shift = await db.shifts.find_one({"id": shift_id, "user_id": user["id"]}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift

@api_router.put("/shifts/{shift_id}")
async def update_shift(shift_id: str, shift: ShiftUpdate, user=Depends(get_current_user)):
    existing = await db.shifts.find_one({"id": shift_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    update_data = {k: v for k, v in shift.model_dump().items() if v is not None}
    
    # Recalculate hours if times changed
    start_time = update_data.get("start_time", existing.get("start_time"))
    end_time = update_data.get("end_time", existing.get("end_time"))
    start_time_2 = update_data.get("start_time_2", existing.get("start_time_2"))
    end_time_2 = update_data.get("end_time_2", existing.get("end_time_2"))
    
    if "start_time" in update_data or "end_time" in update_data or "start_time_2" in update_data or "end_time_2" in update_data:
        total_hours = calculate_total_hours(start_time, end_time)
        night_hours = calculate_night_hours(start_time, end_time, existing["date"])
        
        if start_time_2 and end_time_2:
            total_hours += calculate_total_hours(start_time_2, end_time_2)
            night_hours += calculate_night_hours(start_time_2, end_time_2, existing["date"])
        
        update_data["total_hours"] = total_hours
        update_data["night_hours"] = night_hours
        update_data["holiday_hours"] = total_hours if is_holiday(existing["date"]) else 0
    
    if update_data:
        await db.shifts.update_one({"id": shift_id}, {"$set": update_data})
    
    updated = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    
    # Add default values for new fields if missing
    if "start_time_2" not in updated:
        updated["start_time_2"] = None
    if "end_time_2" not in updated:
        updated["end_time_2"] = None
    if "symbol" not in updated:
        updated["symbol"] = ""
    if "company_id" not in updated:
        updated["company_id"] = 1
    
    return updated

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user=Depends(get_current_user)):
    result = await db.shifts.delete_one({"id": shift_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Shift deleted"}

# ============== SHIFT TEMPLATES (Plantillas de Turno) ==============
@api_router.get("/shift-templates")
async def get_shift_templates(user=Depends(get_current_user)):
    templates = await db.shift_templates.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return templates

@api_router.post("/shift-templates")
async def create_shift_template(template: ShiftTemplateCreate, user=Depends(get_current_user)):
    template_id = str(uuid.uuid4())
    template_doc = {
        "id": template_id,
        "user_id": user["id"],
        "name": template.name,
        "start_time": template.start_time,
        "end_time": template.end_time,
        "start_time_2": template.start_time_2,
        "end_time_2": template.end_time_2,
        "color": template.color,
        "symbol": template.symbol,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shift_templates.insert_one(template_doc)
    template_doc.pop("_id", None)
    return template_doc

@api_router.put("/shift-templates/{template_id}")
async def update_shift_template(template_id: str, template: ShiftTemplateUpdate, user=Depends(get_current_user)):
    existing = await db.shift_templates.find_one({"id": template_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {k: v for k, v in template.model_dump().items() if v is not None}
    if update_data:
        await db.shift_templates.update_one({"id": template_id}, {"$set": update_data})
    
    updated = await db.shift_templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@api_router.delete("/shift-templates/{template_id}")
async def delete_shift_template(template_id: str, user=Depends(get_current_user)):
    result = await db.shift_templates.delete_one({"id": template_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# ============== COMPANIES (Empresas) ==============
@api_router.get("/companies")
async def get_companies(user=Depends(get_current_user)):
    companies = await db.companies.find({"user_id": user["id"]}, {"_id": 0}).to_list(10)
    
    # Si no hay empresas, crear las tres por defecto
    if len(companies) == 0:
        default_companies = [
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "company_number": 1,
                "name": "Empresa A",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "company_number": 2,
                "name": "Empresa B",
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "company_number": 3,
                "name": "Empresa C",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.companies.insert_many(default_companies)
        for c in default_companies:
            c.pop("_id", None)
        return default_companies
    
    return companies

@api_router.put("/companies/{company_number}")
async def update_company(company_number: int, company: CompanyUpdate, user=Depends(get_current_user)):
    existing = await db.companies.find_one({"company_number": company_number, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = {k: v for k, v in company.model_dump().items() if v is not None}
    if update_data:
        await db.companies.update_one({"company_number": company_number, "user_id": user["id"]}, {"$set": update_data})
    
    updated = await db.companies.find_one({"company_number": company_number, "user_id": user["id"]}, {"_id": 0})
    return updated

# Payroll Routes
@api_router.get("/payroll/{year}/{month}")
async def calculate_payroll(year: int, month: int, company_id: Optional[int] = None, user=Depends(get_current_user)):
    import calendar
    
    # Get user settings
    settings = await db.user_settings.find_one({"user_id": user["id"]}, {"_id": 0})
    if not settings:
        settings = {
            "categoria": "vigilante_sin_arma",
            "porcentaje_jornada": 100,
            "trienios": 0,
            "quinquenios": 0,
            "es_responsable_equipo": False,
            "horas_anuales": 1782,
            "meses_trabajo": 11,
            "pagas_prorrateadas": True,
            "tipo_contrato": "indefinido",
            "irpf_porcentaje": 15.0,
            "horas_extra_fuerza_mayor": False
        }
    
    # Get salary table for category
    categoria = settings.get("categoria", "vigilante_sin_arma")
    salary_data = SALARY_TABLES_2026.get(categoria, SALARY_TABLES_2026["vigilante_sin_arma"])
    
    # Calculate hours for this month
    # Según convenio: 162h/mes para jornada 100% (fijo, no proporcional a días del mes)
    HORAS_MES_OBJETIVO = 162
    horas_anuales = settings.get("horas_anuales", 1782)
    meses_trabajo = settings.get("meses_trabajo", 11)
    
    days_in_month = calendar.monthrange(year, month)[1]
    # El objetivo es siempre 162h, ajustado por el porcentaje de jornada
    porcentaje = settings.get("porcentaje_jornada", 100) / 100
    horas_mes_objetivo = HORAS_MES_OBJETIVO * porcentaje
    
    # Get shifts for the month
    month_str = f"{year}-{str(month).zfill(2)}"
    query = {"user_id": user["id"], "date": {"$regex": f"^{month_str}"}}
    if company_id:
        query["company_id"] = company_id
    shifts = await db.shifts.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate hours
    total_hours_worked = sum(s.get("total_hours", 0) for s in shifts)
    total_overtime_hours = sum(s.get("overtime_hours", 0) for s in shifts if s.get("shift_type") == "normal")
    # Las horas extras se suman al total de horas trabajadas para cumplimiento de jornada
    total_hours_with_overtime = total_hours_worked + total_overtime_hours
    
    total_hours_normal = sum(s.get("total_hours", 0) for s in shifts if s.get("shift_type") == "normal")
    night_hours = sum(s.get("night_hours", 0) for s in shifts if s.get("shift_type") == "normal")
    holiday_hours = sum(s.get("holiday_hours", 0) for s in shifts if s.get("shift_type") == "normal")
    overtime_hours = total_overtime_hours
    
    permisos = len([s for s in shifts if s.get("shift_type") == "permiso_retribuido"])
    incapacidad = len([s for s in shifts if s.get("shift_type") == "incapacidad_temporal"])
    accidente = len([s for s in shifts if s.get("shift_type") == "accidente_trabajo"])
    
    horas_permisos = sum(s.get("total_hours", 0) for s in shifts if s.get("shift_type") == "permiso_retribuido")
    horas_it = sum(s.get("total_hours", 0) for s in shifts if s.get("shift_type") == "incapacidad_temporal")
    horas_at = sum(s.get("total_hours", 0) for s in shifts if s.get("shift_type") == "accidente_trabajo")
    # Horas computadas incluyen horas extras para el cálculo de jornada
    horas_computadas = total_hours_with_overtime
    
    # Calculate proportional salary
    # porcentaje ya se calculó arriba
    
    salario_base = salary_data["salario_base"] * porcentaje
    plus_peligrosidad = salary_data["plus_peligrosidad"] * porcentaje
    plus_actividad = salary_data["plus_actividad"] * porcentaje
    plus_transporte = salary_data["plus_transporte"] * porcentaje
    plus_vestuario = salary_data["plus_vestuario"] * porcentaje
    
    # Antigüedad
    trienios = settings.get("trienios", 0)
    quinquenios = settings.get("quinquenios", 0)
    plus_antiguedad = (salary_data["trienio"] * trienios + salary_data["quinquenio"] * quinquenios) * porcentaje
    
    # Plus responsable
    plus_responsable = salary_data["salario_base"] * PLUS_RESPONSABLE_EQUIPO_PERCENT * porcentaje if settings.get("es_responsable_equipo") else 0
    
    # Night and holiday supplements
    plus_nocturnidad = night_hours * salary_data["nocturnidad_hora"]
    plus_festivo = holiday_hours * PLUS_FESTIVO_HORA
    
    # Plus específico del servicio (personalizado)
    plus_servicio_nombre = settings.get("plus_servicio_nombre", "")
    plus_servicio_importe = settings.get("plus_servicio_importe", 0.0)
    
    # ============== PLUSES DEL CONVENIO ==============
    # Plus Kilometraje
    plus_kilometraje_km = settings.get("plus_kilometraje_km", 0)
    plus_kilometraje = plus_kilometraje_km * PLUS_KILOMETRAJE
    
    # Plus Aeropuerto
    plus_aeropuerto_horas = settings.get("plus_aeropuerto_horas", 0)
    plus_aeropuerto = plus_aeropuerto_horas * PLUS_AEROPUERTO_HORA
    
    # Plus Radioscopia Aeroportuaria
    plus_radioscopia_aeroportuaria_horas = settings.get("plus_radioscopia_aeroportuaria_horas", 0)
    plus_radioscopia_aeroportuaria = plus_radioscopia_aeroportuaria_horas * PLUS_RADIOSCOPIA_AEROPORTUARIA_HORA
    
    # Plus Filtro/Rotación
    plus_filtro_rotacion_horas = settings.get("plus_filtro_rotacion_horas", 0)
    plus_filtro_rotacion = plus_filtro_rotacion_horas * PLUS_FILTRO_ROTACION_HORA
    
    # Plus Radioscopia Básica (con tope)
    plus_radioscopia_basica_horas = settings.get("plus_radioscopia_basica_horas", 0)
    plus_radioscopia_basica = min(plus_radioscopia_basica_horas * PLUS_RADIOSCOPIA_BASICA_HORA, PLUS_RADIOSCOPIA_BASICA_TOPE)
    
    # Plus Escolta
    plus_escolta_horas = settings.get("plus_escolta_horas", 0)
    plus_escolta = plus_escolta_horas * PLUS_ESCOLTA_HORA
    
    # Plus Nochebuena y Nochevieja
    plus_nochebuena = PLUS_NOCHEBUENA_NOCHEVIEJA if settings.get("plus_nochebuena", False) else 0
    plus_nochevieja = PLUS_NOCHEBUENA_NOCHEVIEJA if settings.get("plus_nochevieja", False) else 0
    
    # Plus Hijo Discapacitado
    plus_hijo_discapacitado = PLUS_HIJO_DISCAPACITADO if settings.get("plus_hijo_discapacitado", False) else 0
    
    # Plus Asistencia a Juicio (valor por categoría + antigüedad por hora)
    # Según convenio: valor base variable por categoría + antigüedad prorrateada por hora
    plus_asistencia_juicio_horas = settings.get("plus_asistencia_juicio_horas", 0)
    horas_mes_objetivo = settings.get("horas_anuales", 1782) / settings.get("meses_trabajo", 11)
    antiguedad_completa = (salary_data["trienio"] * settings.get("trienios", 0)) + (salary_data["quinquenio"] * settings.get("quinquenios", 0))
    antiguedad_por_hora = antiguedad_completa / horas_mes_objetivo
    # Obtener el valor base por categoría
    valor_base_hora_juicio = PRECIO_HORA_ASISTENCIA_JUICIO.get(categoria, 9.98)
    valor_hora_juicio = valor_base_hora_juicio + antiguedad_por_hora
    plus_asistencia_juicio = plus_asistencia_juicio_horas * valor_hora_juicio
    
    # Dietas
    dieta_una_comida = settings.get("dieta_una_comida", 0) * 11.93
    dieta_dos_comidas = settings.get("dieta_dos_comidas", 0) * 22.00
    dieta_pernocta_desayuno = settings.get("dieta_pernocta_desayuno", 0) * 20.18
    dieta_pernocta_dos_comidas = settings.get("dieta_pernocta_dos_comidas", 0) * 40.35
    dieta_completa_8_dia = settings.get("dieta_completa_8_dia", 0) * 32.07
    
    # Total pluses convenio
    total_pluses_convenio = (plus_kilometraje + plus_aeropuerto + plus_radioscopia_aeroportuaria + 
                              plus_filtro_rotacion + plus_radioscopia_basica + plus_escolta + 
                              plus_nochebuena + plus_nochevieja + plus_hijo_discapacitado + plus_asistencia_juicio)
    
    # Total dietas
    total_dietas = (dieta_una_comida + dieta_dos_comidas + dieta_pernocta_desayuno + 
                    dieta_pernocta_dos_comidas + dieta_completa_8_dia)
    
    # ============== PAGAS EXTRAS ==============
    # Pagas extras: salario base + antigüedad + peligrosidad
    # Se cobran en marzo, julio, diciembre (íntegras) o prorrateadas mensualmente
    paga_extra_base = salario_base + plus_antiguedad + plus_peligrosidad
    pagas_prorrateadas = settings.get("pagas_prorrateadas", True)
    
    if pagas_prorrateadas:
        # Prorrateada: 3 pagas extras / 12 meses = añadir 1/4 de paga cada mes
        prorrateo_paga_extra = (paga_extra_base * 3) / 12
        paga_extra_mes = prorrateo_paga_extra
        es_mes_paga_extra = False
    else:
        # Íntegras: solo en marzo (3), julio (7), diciembre (12)
        prorrateo_paga_extra = 0
        if month in [3, 7, 12]:
            paga_extra_mes = paga_extra_base
            es_mes_paga_extra = True
        else:
            paga_extra_mes = 0
            es_mes_paga_extra = False
    
    # ============== CÁLCULO BRUTO ==============
    # Base mensual sin transporte ni vestuario (para base cotización)
    salario_bruto_base = salario_base + plus_peligrosidad + plus_actividad + plus_antiguedad + plus_responsable
    
    # Pluses que cotizan (incluyendo plus servicio y pluses del convenio)
    pluses_cotizables = plus_nocturnidad + plus_festivo + paga_extra_mes + plus_servicio_importe + total_pluses_convenio
    
    # Pluses que NO cotizan (transporte, vestuario y dietas tienen límites exentos)
    pluses_no_cotizables = plus_transporte + plus_vestuario + total_dietas
    
    # Total bruto
    total_bruto = salario_bruto_base + pluses_cotizables + pluses_no_cotizables
    
    # ============== BASE DE COTIZACIÓN ==============
    # La base incluye salario + pluses cotizables (excluye transporte/vestuario hasta límites)
    base_cotizacion = salario_bruto_base + pluses_cotizables
    
    # ============== DEDUCCIONES TRABAJADOR ==============
    tipo_contrato = settings.get("tipo_contrato", "indefinido")
    irpf_porcentaje = settings.get("irpf_porcentaje", 15.0)
    horas_extra_fuerza_mayor = settings.get("horas_extra_fuerza_mayor", False)
    
    # Contingencias Comunes: 4,70%
    deduccion_cc = base_cotizacion * 0.047
    
    # Desempleo: 1,55% indefinido, 1,60% temporal
    tasa_desempleo_trabajador = 0.0155 if tipo_contrato == "indefinido" else 0.0160
    deduccion_desempleo = base_cotizacion * tasa_desempleo_trabajador
    
    # Formación Profesional: 0,10%
    deduccion_fp = base_cotizacion * 0.001
    
    # MEI (Mecanismo de Equidad Intergeneracional) 2026: 0,13% trabajador
    deduccion_mei = base_cotizacion * 0.0013
    
    # Horas extras: 4,70% ordinarias o 2% fuerza mayor
    # Calculamos base de horas extras (aproximación)
    if horas_mes_objetivo > 0:
        valor_hora = salario_bruto_base / horas_mes_objetivo
    else:
        valor_hora = 0
    importe_horas_extras = overtime_hours * valor_hora * 1.75  # Las extras se pagan al 175%
    
    tasa_horas_extras = 0.02 if horas_extra_fuerza_mayor else 0.047
    deduccion_horas_extras = importe_horas_extras * tasa_horas_extras
    
    # Total deducciones SS trabajador
    total_deducciones_ss = deduccion_cc + deduccion_desempleo + deduccion_fp + deduccion_mei + deduccion_horas_extras
    
    # IRPF
    deduccion_irpf = total_bruto * (irpf_porcentaje / 100)
    
    # Total deducciones trabajador
    total_deducciones = total_deducciones_ss + deduccion_irpf
    
    # ============== SALARIO NETO ==============
    salario_neto = total_bruto - total_deducciones
    
    # ============== COSTES EMPRESA ==============
    # Contingencias Comunes empresa: 23,60%
    coste_cc_empresa = base_cotizacion * 0.2360
    
    # Desempleo empresa: 5,50% indefinido, 6,70% temporal
    tasa_desempleo_empresa = 0.0550 if tipo_contrato == "indefinido" else 0.0670
    coste_desempleo_empresa = base_cotizacion * tasa_desempleo_empresa
    
    # FOGASA: 0,20%
    coste_fogasa = base_cotizacion * 0.0020
    
    # Formación Profesional empresa: 0,60%
    coste_fp_empresa = base_cotizacion * 0.0060
    
    # AT y EP (Accidentes de Trabajo y Enfermedades Profesionales): ~1,50% para seguridad privada
    coste_at_ep = base_cotizacion * 0.0150
    
    # MEI empresa 2026: 0,58%
    coste_mei_empresa = base_cotizacion * 0.0058
    
    # Cotización horas extras empresa
    coste_horas_extras_empresa = importe_horas_extras * (0.12 if horas_extra_fuerza_mayor else 0.2360)
    
    # Total coste empresa (SS)
    total_coste_ss_empresa = coste_cc_empresa + coste_desempleo_empresa + coste_fogasa + coste_fp_empresa + coste_at_ep + coste_mei_empresa + coste_horas_extras_empresa
    
    # Coste total empresa = Bruto trabajador + SS empresa
    coste_total_empresa = total_bruto + total_coste_ss_empresa
    
    return {
        "year": year,
        "month": month,
        "categoria": salary_data["name"],
        "porcentaje_jornada": settings.get("porcentaje_jornada", 100),
        "tipo_contrato": tipo_contrato,
        "jornada": {
            "horas_anuales": horas_anuales,
            "meses_trabajo": meses_trabajo,
            "horas_mes_objetivo": round(horas_mes_objetivo, 2),
            "dias_mes": days_in_month
        },
        "desglose_bruto": {
            "salario_base": round(salario_base, 2),
            "plus_peligrosidad": round(plus_peligrosidad, 2),
            "plus_actividad": round(plus_actividad, 2),
            "plus_transporte": round(plus_transporte, 2),
            "plus_vestuario": round(plus_vestuario, 2),
            "plus_antiguedad": round(plus_antiguedad, 2),
            "plus_responsable_equipo": round(plus_responsable, 2),
            "plus_nocturnidad": round(plus_nocturnidad, 2),
            "plus_festivo": round(plus_festivo, 2),
            "plus_servicio_nombre": plus_servicio_nombre,
            "plus_servicio_importe": round(plus_servicio_importe, 2),
            "paga_extra": round(paga_extra_mes, 2),
            "pluses_convenio": {
                "plus_kilometraje": round(plus_kilometraje, 2) if plus_kilometraje > 0 else 0,
                "plus_aeropuerto": round(plus_aeropuerto, 2) if plus_aeropuerto > 0 else 0,
                "plus_radioscopia_aeroportuaria": round(plus_radioscopia_aeroportuaria, 2) if plus_radioscopia_aeroportuaria > 0 else 0,
                "plus_filtro_rotacion": round(plus_filtro_rotacion, 2) if plus_filtro_rotacion > 0 else 0,
                "plus_radioscopia_basica": round(plus_radioscopia_basica, 2) if plus_radioscopia_basica > 0 else 0,
                "plus_escolta": round(plus_escolta, 2) if plus_escolta > 0 else 0,
                "plus_nochebuena": round(plus_nochebuena, 2) if plus_nochebuena > 0 else 0,
                "plus_nochevieja": round(plus_nochevieja, 2) if plus_nochevieja > 0 else 0,
                "plus_hijo_discapacitado": round(plus_hijo_discapacitado, 2) if plus_hijo_discapacitado > 0 else 0,
                "plus_asistencia_juicio": round(plus_asistencia_juicio, 2) if plus_asistencia_juicio > 0 else 0,
                "total": round(total_pluses_convenio, 2)
            },
            "dietas": {
                "dieta_una_comida": round(dieta_una_comida, 2) if dieta_una_comida > 0 else 0,
                "dieta_dos_comidas": round(dieta_dos_comidas, 2) if dieta_dos_comidas > 0 else 0,
                "dieta_pernocta_desayuno": round(dieta_pernocta_desayuno, 2) if dieta_pernocta_desayuno > 0 else 0,
                "dieta_pernocta_dos_comidas": round(dieta_pernocta_dos_comidas, 2) if dieta_pernocta_dos_comidas > 0 else 0,
                "dieta_completa_8_dia": round(dieta_completa_8_dia, 2) if dieta_completa_8_dia > 0 else 0,
                "total": round(total_dietas, 2)
            }
        },
        "pagas_extras": {
            "prorrateadas": pagas_prorrateadas,
            "importe_paga": round(paga_extra_base, 2),
            "meses_cobro": [3, 7, 12] if not pagas_prorrateadas else "mensual",
            "es_mes_paga": es_mes_paga_extra if not pagas_prorrateadas else False
        },
        "horas": {
            "trabajadas": round(total_hours_normal, 2),
            "computadas": round(horas_computadas, 2),
            "nocturnas": round(night_hours, 2),
            "festivas": round(holiday_hours, 2),
            "extras": round(overtime_hours, 2),
            "permisos": round(horas_permisos, 2),
            "it": round(horas_it, 2),
            "at": round(horas_at, 2),
            "importe_horas_extras": round(importe_horas_extras, 2)
        },
        "ausencias": {
            "permisos_retribuidos": permisos,
            "incapacidad_temporal": incapacidad,
            "accidente_trabajo": accidente
        },
        "base_cotizacion": round(base_cotizacion, 2),
        "total_bruto": round(total_bruto, 2),
        "deducciones_trabajador": {
            "contingencias_comunes": round(deduccion_cc, 2),
            "desempleo": round(deduccion_desempleo, 2),
            "formacion_profesional": round(deduccion_fp, 2),
            "mei": round(deduccion_mei, 2),
            "horas_extras": round(deduccion_horas_extras, 2),
            "total_ss": round(total_deducciones_ss, 2),
            "irpf_porcentaje": irpf_porcentaje,
            "irpf": round(deduccion_irpf, 2),
            "total": round(total_deducciones, 2)
        },
        "salario_neto": round(salario_neto, 2),
        "costes_empresa": {
            "contingencias_comunes": round(coste_cc_empresa, 2),
            "desempleo": round(coste_desempleo_empresa, 2),
            "fogasa": round(coste_fogasa, 2),
            "formacion_profesional": round(coste_fp_empresa, 2),
            "at_ep": round(coste_at_ep, 2),
            "mei": round(coste_mei_empresa, 2),
            "horas_extras": round(coste_horas_extras_empresa, 2),
            "total_ss": round(total_coste_ss_empresa, 2),
            "coste_total": round(coste_total_empresa, 2)
        },
        "shifts_count": len(shifts)
    }

# Holidays Routes
@api_router.get("/holidays/{year}")
async def get_holidays(year: int):
    if year == 2026:
        return {
            "year": year,
            "holidays": [
                {"date": "2026-01-01", "name": "Año Nuevo"},
                {"date": "2026-01-06", "name": "Epifanía del Señor"},
                {"date": "2026-04-02", "name": "Jueves Santo"},
                {"date": "2026-04-03", "name": "Viernes Santo"},
                {"date": "2026-05-01", "name": "Fiesta del Trabajo"},
                {"date": "2026-08-15", "name": "Asunción de la Virgen"},
                {"date": "2026-10-12", "name": "Fiesta Nacional de España"},
                {"date": "2026-11-02", "name": "Día de Todos los Santos"},
                {"date": "2026-12-07", "name": "Día de la Constitución"},
                {"date": "2026-12-08", "name": "Inmaculada Concepción"},
                {"date": "2026-12-25", "name": "Navidad"}
            ]
        }
    return {"year": year, "holidays": []}

# Categories Routes
@api_router.get("/categories")
async def get_categories():
    return [
        {"id": key, "name": val["name"], "salario_total": val["salario_total"]}
        for key, val in SALARY_TABLES_2026.items()
    ]

@api_router.get("/salary-table/{categoria}")
async def get_salary_table(categoria: str):
    if categoria not in SALARY_TABLES_2026:
        raise HTTPException(status_code=404, detail="Category not found")
    return SALARY_TABLES_2026[categoria]

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
