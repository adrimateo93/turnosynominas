# SeguriTurno - PRD (Product Requirements Document)

## Problema Original
Aplicación web para gestión de turnos de trabajo para vigilantes de seguridad privada en España, con calculadora de nóminas completa según el Convenio Colectivo de Seguridad Privada 2026.

## Fecha de Última Actualización
25 de Marzo de 2026

## Funcionalidades Implementadas

### 1. Sistema de Autenticación
- Registro/Login con JWT (7 días validez)
- Logout y gestión de sesión

### 2. Calendario de Turnos
- Vista mensual con festivos nacionales y locales
- **Casillas grandes y espaciosas** con navegación del mes reorganizada
- Turnos personalizables (hora, color, comentario, alarma, símbolo)
- **Colores de fondo de casilla** - Puedes colorear el día entero además del turno
- **Eliminación rápida** - Botón X rojo al pasar el cursor sobre un turno
- Tipos: Normal, Permiso Retribuido, IT, Accidente Trabajo
- Notificaciones push 1 hora antes (PWA)
- **Turnos partidos (turno partido)** - Dos tramos horarios en el mismo día
- **Indicador de comentarios** - Icono visible en casillas con comentario
- **Símbolos personalizables** - Estrellas, círculos, checks, etc.

### 3. Sistema de Turnos Guardados (antes "Plantillas")
- Crear turnos personalizados (Mañana, Tarde, Noche, etc.)
- Incluyen horarios, colores, símbolos y soporte para turno partido
- Barra de aplicación rápida encima del calendario
- Click en turno + click en día = turno añadido automáticamente
- Renombrado: "Crear Turno" y "Turnos" (más intuitivo)

### 4. Sistema Multi-Empresa
- Dos calendarios independientes por usuario (Empresa A, Empresa B)
- Nombres de empresa personalizables
- Cálculos de horas y nómina completamente independientes
- Selector visual en Dashboard Y en Nómina (sincronizado)

### 5. Cálculo de Horas
- **Jornada 100% = 162 horas/mes EXACTAS** (no proporcional a días)
- Horas nocturnas (22:00-06:00)
- Horas festivas (sábados, domingos, festivos nacionales)
- Progreso visual con colores (rojo si falta, verde si cumple)
- Desglose de horas extras

### 6. Festivos Locales
- Modal para añadir festivos locales personalizados
- Se marcan en el calendario con color púrpura
- Afectan al cálculo de horas festivas

### 7. Pagas Extras
- **3 pagas extras**: Marzo, Julio, Diciembre
- **Composición**: Salario Base + Antigüedad + Peligrosidad
- **Opciones de cobro**:
  - Prorrateadas: Se añaden mensualmente (1/4 de paga)
  - Íntegras: Se cobran completas en marzo, julio, diciembre

### 8. Calculadora de Nómina con Impuestos
- **Selector de empresa** sincronizado con el calendario
- **Horas coinciden** entre calendario y nómina
- **Salario Bruto**: Todos los devengos
- **Deducciones Trabajador**:
  - Contingencias Comunes: 4,70%
  - Desempleo: 1,55% (indefinido) / 1,60% (temporal)
  - Formación Profesional: 0,10%
  - MEI 2026: 0,13%
  - Horas Extra: 4,70% (ordinarias) / 2% (fuerza mayor)
  - IRPF: Personalizable (2% - 47%)
- **Salario Neto**: Bruto - Deducciones
- **Costes Empresa**:
  - Contingencias Comunes: 23,60%
  - Desempleo: 5,50% (indefinido) / 6,70% (temporal)
  - FOGASA: 0,20%
  - Formación Profesional: 0,60%
  - AT y EP: ~1,50%
  - MEI 2026: 0,58%
- **Coste Total Empresa**: Bruto + SS Empresa

### 9. Configuración de Usuario
- Categoría profesional (10 categorías)
- Porcentaje jornada (100%, 75%, 50%, 25%)
- Tipo contrato (Indefinido/Temporal)
- IRPF personalizable
- Trienios y quinquenios
- Pagas prorrateadas o íntegras
- Responsable de equipo (+10%)
- Plus de servicio específico personalizable

### 10. PWA con Notificaciones Push
- Service Worker para alarmas en segundo plano
- Instalable como app móvil

## Arquitectura

### Backend (FastAPI + MongoDB)
- `/api/auth/*` - Autenticación JWT
- `/api/shifts/*` - CRUD de turnos (con company_id)
- `/api/settings/*` - Configuración usuario
- `/api/payroll/{year}/{month}?company_id=X` - Cálculo nómina por empresa
- `/api/shift-templates/*` - CRUD de turnos guardados
- `/api/companies/*` - Gestión de empresas

### Frontend (React + Shadcn UI + PWA)
- Dashboard con calendario grande y selector de empresa
- Barra de turnos de aplicación rápida
- Payroll con selector de empresa (sincronizado) y 3 pestañas
- Settings con fiscalidad y pagas extras

### Base de Datos (MongoDB)
- `users`: Datos de autenticación
- `user_settings`: Configuración laboral
- `shifts`: Turnos con company_id, start_time_2, end_time_2, symbol
- `shift_templates`: Turnos guardados personalizados
- `companies`: Empresas del usuario (2 por defecto)

## Cambios de Esta Sesión (25 Marzo 2026 v2.1)

### Corregidos:
- ✅ Nómina ahora suma correctamente las horas del calendario
- ✅ Objetivo de jornada es exactamente 162h (no proporcional)
- ✅ Selector de empresa sincronizado entre Dashboard y Nómina

### Nuevas funcionalidades:
- ✅ Eliminación rápida de turnos (botón X al pasar cursor)
- ✅ Colores de fondo para las casillas del día
- ✅ Casillas del calendario más grandes

### Cambios de UI:
- ✅ Navegación del mes en la misma línea (no debajo de festivos)
- ✅ "Plantillas de Turno" → "Crear Turno"
- ✅ "Mis Plantillas" → "Turnos"

## Próximos Pasos (Backlog)

### P0 - Alta Prioridad
- Exportar calendario completo a PDF

### P1 - Media Prioridad
- Historial de nóminas guardadas
- Gráficas de horas y salario anual

### P2 - Baja Prioridad
- Modo offline completo
- Compartir calendario con supervisor
- Copiar semana (replicar turnos de una semana a otra)
