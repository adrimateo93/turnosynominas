import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, ChevronRight, Plus, Bell, Moon, Sun as SunIcon, Trash2, Edit2, 
  Target, TrendingUp, CalendarPlus, Clock, MessageSquare, Building2, Bookmark, 
  Settings2, Zap
} from "lucide-react";

const SPANISH_HOLIDAYS_2026 = [
  "2026-01-01", "2026-01-06", "2026-04-02", "2026-04-03", "2026-05-01",
  "2026-08-15", "2026-10-12", "2026-11-02", "2026-12-07", "2026-12-08", "2026-12-25"
];

const SHIFT_COLORS = [
  { id: "#EF4444", name: "Rojo" },
  { id: "#F97316", name: "Naranja" },
  { id: "#EAB308", name: "Amarillo" },
  { id: "#22C55E", name: "Verde" },
  { id: "#3B82F6", name: "Azul" },
  { id: "#8B5CF6", name: "Morado" },
  { id: "#EC4899", name: "Rosa" },
  { id: "#06B6D4", name: "Cyan" },
  { id: "#FFFFFF", name: "Blanco" },
  { id: "#1F2937", name: "Negro" }
];

const SHIFT_SYMBOLS = [
  { id: "none", name: "Sin símbolo" },
  { id: "★", name: "★ Estrella" },
  { id: "●", name: "● Círculo" },
  { id: "■", name: "■ Cuadrado" },
  { id: "▲", name: "▲ Triángulo" },
  { id: "♦", name: "♦ Diamante" },
  { id: "✓", name: "✓ Check" },
  { id: "!", name: "! Importante" },
  { id: "?", name: "? Duda" },
  { id: "⚠", name: "⚠ Alerta" },
  { id: "♥", name: "♥ Corazón" },
  { id: "⚡", name: "⚡ Rayo" }
];

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const HORAS_OBJETIVO_MES = 162;

export default function Dashboard() {
  const { authAxios } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(() => {
    const saved = localStorage.getItem('selectedCompany');
    return saved ? parseInt(saved) : 1;
  });
  const [localHolidays, setLocalHolidays] = useState(() => {
    const saved = localStorage.getItem('localHolidays');
    return saved ? JSON.parse(saved) : [];
  });
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [isTurnoPartido, setIsTurnoPartido] = useState(false);
  
  const [templateForm, setTemplateForm] = useState({
    name: "",
    label: "",
    start_time: "08:00",
    end_time: "14:00",
    start_time_2: "",
    end_time_2: "",
    color: "#3B82F6",
    symbol: "none"
  });
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [companyNames, setCompanyNames] = useState({ 1: "Empresa A", 2: "Empresa B", 3: "Empresa C" });
  
  const [formData, setFormData] = useState({
    label: "",
    start_time: "08:00",
    end_time: "14:00",
    start_time_2: "",
    end_time_2: "",
    overtime_hours: 0,
    color: "#3B82F6",
    comment: "",
    alarm_enabled: false,
    symbol: "none"
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    localStorage.setItem('selectedCompany', selectedCompany.toString());
  }, [selectedCompany]);

  useEffect(() => {
    localStorage.setItem('localHolidays', JSON.stringify(localHolidays));
  }, [localHolidays]);

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get(`/shifts?year=${year}&month=${month + 1}&company_id=${selectedCompany}`);
      setShifts(response.data);
    } catch (error) {
      console.error("Error fetching shifts:", error);
      toast.error("Error al cargar turnos");
    } finally {
      setLoading(false);
    }
  }, [authAxios, year, month, selectedCompany]);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await authAxios.get('/shift-templates');
      setShiftTemplates(response.data);
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }, [authAxios]);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await authAxios.get('/companies');
      setCompanies(response.data);
      const names = {};
      response.data.forEach(c => {
        names[c.company_number] = c.name;
      });
      setCompanyNames(names);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    fetchTemplates();
    fetchCompanies();
  }, [fetchTemplates, fetchCompanies]);

  const isLocalHoliday = (dateStr) => localHolidays.some(h => h.date === dateStr);

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;
    
    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, currentMonth: false, date: null });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month, i).getDay();
      const isSaturday = dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      const isNationalHoliday = SPANISH_HOLIDAYS_2026.includes(dateStr);
      const isLocalHol = isLocalHoliday(dateStr);
      const isToday = dateStr === new Date().toISOString().split("T")[0];
      
      days.push({
        day: i,
        currentMonth: true,
        date: dateStr,
        isSaturday,
        isSunday,
        isWeekend: isSaturday || isSunday,
        isNationalHoliday,
        isLocalHoliday: isLocalHol,
        isHoliday: isNationalHoliday || isLocalHol,
        isToday,
        shifts: shifts.filter(s => s.date === dateStr)
      });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, currentMonth: false, date: null });
    }
    
    return days;
  };

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (day) => {
    if (!day.currentMonth || !day.date) return;
    
    // Si estamos en modo eliminar, eliminamos todos los turnos del día
    if (deleteMode) {
      if (day.shifts && day.shifts.length > 0) {
        day.shifts.forEach(async (shift) => {
          try {
            await authAxios.delete(`/shifts/${shift.id}`);
          } catch (error) {
            console.error("Error deleting shift:", error);
          }
        });
        toast.success(`${day.shifts.length} turno(s) eliminado(s)`);
        fetchShifts();
      } else {
        toast.info("No hay turnos en este día");
      }
      return;
    }
    
    setSelectedDate(day.date);
    setEditingShift(null);
    setIsTurnoPartido(false);
    setFormData({
      label: "",
      start_time: "08:00",
      end_time: "14:00",
      start_time_2: "",
      end_time_2: "",
      overtime_hours: 0,
      color: "#3B82F6",
      comment: "",
      alarm_enabled: false,
      symbol: "none"
    });
    setShowModal(true);
  };

  const handleEditShift = (e, shift) => {
    e.stopPropagation();
    
    // Si estamos en modo eliminar, eliminamos este turno
    if (deleteMode) {
      handleDeleteShiftDirect(shift.id);
      return;
    }
    
    setSelectedDate(shift.date);
    setEditingShift(shift);
    const hasSecondShift = shift.start_time_2 && shift.end_time_2;
    setIsTurnoPartido(hasSecondShift);
    setFormData({
      label: shift.label || "",
      start_time: shift.start_time,
      end_time: shift.end_time,
      start_time_2: shift.start_time_2 || "",
      end_time_2: shift.end_time_2 || "",
      overtime_hours: shift.overtime_hours,
      color: shift.color,
      comment: shift.comment || "",
      alarm_enabled: shift.alarm_enabled,
      symbol: shift.symbol || "none"
    });
    setShowModal(true);
  };

  const handleDeleteShiftDirect = async (shiftId) => {
    try {
      await authAxios.delete(`/shifts/${shiftId}`);
      toast.success("Turno eliminado");
      fetchShifts();
    } catch (error) {
      toast.error("Error al eliminar turno");
    }
  };

  const handleDeleteShift = async (e, shiftId) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar este turno?")) return;
    handleDeleteShiftDirect(shiftId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) return;
    
    // Verificar límite de 2 turnos por día (solo al crear nuevo)
    if (!editingShift) {
      const existingShifts = shifts.filter(s => s.date === selectedDate && s.company_id === selectedCompany);
      if (existingShifts.length >= 2) {
        toast.error("Máximo 2 turnos por día");
        return;
      }
    }
    
    const payload = {
      ...formData,
      date: selectedDate,
      company_id: selectedCompany,
      symbol: formData.symbol === "none" ? "" : formData.symbol,
      shift_type: "normal"
    };
    
    console.log("Payload con label:", payload.label); // Debug
    
    if (isTurnoPartido && formData.start_time_2 && formData.end_time_2) {
      payload.start_time_2 = formData.start_time_2;
      payload.end_time_2 = formData.end_time_2;
    } else {
      payload.start_time_2 = null;
      payload.end_time_2 = null;
    }
    
    try {
      if (editingShift) {
        await authAxios.put(`/shifts/${editingShift.id}`, payload);
        toast.success("Turno actualizado");
      } else {
        await authAxios.post("/shifts", payload);
        toast.success("Turno añadido");
      }
      setShowModal(false);
      setSelectedDate(null);
      fetchShifts();
    } catch (error) {
      toast.error("Error al guardar turno");
      console.error("Error detallado:", error);
    }
  };

  const applyTemplate = async (template) => {
    if (!selectedDate) return;
    
    const payload = {
      date: selectedDate,
      start_time: template.start_time,
      end_time: template.end_time,
      start_time_2: template.start_time_2 || null,
      end_time_2: template.end_time_2 || null,
      overtime_hours: 0,
      color: template.color,
      comment: "",
      alarm_enabled: false,
      shift_type: "normal",
      symbol: template.symbol === "none" ? "" : (template.symbol || ""),
      label: template.label || "",
      company_id: selectedCompany
    };
    
    try {
      await authAxios.post("/shifts", payload);
      toast.success(`"${template.name}" aplicado`);
      setShowModal(false);
      setSelectedDate(null);
      fetchShifts();
    } catch (error) {
      toast.error("Error al aplicar turno");
    }
  };

  const handleQuickShift = async (type) => {
    if (!selectedDate) {
      toast.error("Selecciona una fecha primero");
      return;
    }
    
    // Calcular horas según el tipo
    let totalHours = 0;
    let shiftType = type;
    let shiftColor = "#10B981";
    let shiftLabel = "";
    
    // Obtener días del mes actual
    const [year, month] = selectedDate.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    switch(type) {
      case 'vacaciones':
        totalHours = 162 / daysInMonth;
        shiftType = "normal";
        shiftColor = "#10B981"; // Verde
        shiftLabel = "VAC";
        break;
      case 'incapacidad_temporal':
        totalHours = 5.335;
        shiftType = "incapacidad_temporal";
        shiftColor = "#F97316"; // Naranja
        shiftLabel = "IT";
        break;
      case 'accidente_trabajo':
        totalHours = 5.40;
        shiftType = "accidente_trabajo";
        shiftColor = "#EF4444"; // Rojo
        shiftLabel = "AT";
        break;
      case 'permiso_retribuido':
        totalHours = 5.335;
        shiftType = "permiso_retribuido";
        shiftColor = "#3B82F6"; // Azul
        shiftLabel = "PR";
        break;
      case 'asuntos_propios':
        totalHours = 0;
        shiftType = "normal";
        shiftColor = "#A855F7"; // Púrpura
        shiftLabel = "AP";
        break;
    }
    
    // Calcular horarios ficticios (08:00 + horas calculadas)
    const startHour = 8;
    const endHour = startHour + Math.floor(totalHours);
    const endMinutes = Math.round((totalHours % 1) * 60);
    
    const startTime = `${String(startHour).padStart(2, '0')}:00`;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    
    const payload = {
      date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      start_time_2: null,
      end_time_2: null,
      overtime_hours: 0,
      color: shiftColor,
      comment: "",
      alarm_enabled: false,
      shift_type: shiftType,
      symbol: "",
      label: shiftLabel,
      company_id: selectedCompany
    };
    
    try {
      await authAxios.post("/shifts", payload);
      toast.success(`${shiftLabel} añadido (${totalHours.toFixed(2)}h)`);
      setShowModal(false);
      setSelectedDate(null);
      fetchShifts();
    } catch (error) {
      toast.error("Error al añadir turno especial");
    }
  };

  const [quickApplyTemplate, setQuickApplyTemplate] = useState(null);
  
  const handleQuickDayClick = async (day) => {
    if (!day.currentMonth || !day.date) return;
    
    if (deleteMode) {
      handleDayClick(day);
      return;
    }
    
    // Limitar a 2 turnos máximo por casilla
    if (day.shifts && day.shifts.length >= 2) {
      toast.error("Máximo 2 turnos por día");
      return;
    }
    
    if (quickApplyTemplate) {
      const payload = {
        date: day.date,
        start_time: quickApplyTemplate.start_time,
        end_time: quickApplyTemplate.end_time,
        start_time_2: quickApplyTemplate.start_time_2 || null,
        end_time_2: quickApplyTemplate.end_time_2 || null,
        overtime_hours: 0,
        color: quickApplyTemplate.color,
        comment: "",
        alarm_enabled: false,
        shift_type: "normal",
        symbol: quickApplyTemplate.symbol === "none" ? "" : (quickApplyTemplate.symbol || ""),
        label: quickApplyTemplate.label || "",
        company_id: selectedCompany
      };
      
      try {
        await authAxios.post("/shifts", payload);
        toast.success(`"${quickApplyTemplate.name}" añadido`);
        fetchShifts();
      } catch (error) {
        toast.error("Error al añadir turno");
      }
    } else {
      handleDayClick(day);
    }
  };

  const handleAddLocalHoliday = () => {
    if (!newHolidayDate || !newHolidayName) {
      toast.error("Introduce fecha y nombre del festivo");
      return;
    }
    if (localHolidays.some(h => h.date === newHolidayDate)) {
      toast.error("Este festivo ya existe");
      return;
    }
    setLocalHolidays([...localHolidays, { date: newHolidayDate, name: newHolidayName }]);
    setNewHolidayDate("");
    setNewHolidayName("");
    toast.success("Festivo local añadido");
  };

  const handleRemoveLocalHoliday = (date) => {
    setLocalHolidays(localHolidays.filter(h => h.date !== date));
    toast.success("Festivo eliminado");
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.start_time || !templateForm.end_time) {
      toast.error("Nombre y horarios son obligatorios");
      return;
    }
    
    const payload = {
      ...templateForm,
      symbol: templateForm.symbol === "none" ? "" : templateForm.symbol
    };
    
    try {
      if (editingTemplate) {
        await authAxios.put(`/shift-templates/${editingTemplate.id}`, payload);
        toast.success("Turno actualizado");
      } else {
        await authAxios.post("/shift-templates", payload);
        toast.success("Turno creado");
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm({
        name: "",
        start_time: "08:00",
        end_time: "14:00",
        start_time_2: "",
        end_time_2: "",
        color: "#3B82F6",
        symbol: "none"
      });
      fetchTemplates();
    } catch (error) {
      toast.error("Error al guardar turno");
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      start_time: template.start_time,
      end_time: template.end_time,
      start_time_2: template.start_time_2 || "",
      end_time_2: template.end_time_2 || "",
      color: template.color,
      symbol: template.symbol || "none"
    });
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await authAxios.delete(`/shift-templates/${templateId}`);
      toast.success("Turno eliminado");
      fetchTemplates();
    } catch (error) {
      toast.error("Error al eliminar turno");
    }
  };

  const handleUpdateCompanyName = async (companyNumber, newName) => {
    try {
      await authAxios.put(`/companies/${companyNumber}`, { name: newName });
      setCompanyNames(prev => ({ ...prev, [companyNumber]: newName }));
      toast.success("Nombre actualizado");
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const monthStats = {
    totalHours: shifts.reduce((sum, s) => sum + (s.total_hours || 0), 0),
    nightHours: shifts.reduce((sum, s) => sum + (s.night_hours || 0), 0),
    holidayHours: shifts.reduce((sum, s) => sum + (s.holiday_hours || 0), 0),
    overtimeHours: shifts.reduce((sum, s) => sum + (s.overtime_hours || 0), 0),
    shiftsCount: shifts.length
  };

  const horasComputadas = monthStats.totalHours;
  const cumpleJornada = horasComputadas >= HORAS_OBJETIVO_MES;
  const horasExtrasRealizadas = cumpleJornada ? horasComputadas - HORAS_OBJETIVO_MES : 0;
  const horasFaltantes = !cumpleJornada ? HORAS_OBJETIVO_MES - horasComputadas : 0;
  const progressPercent = Math.min(100, (horasComputadas / HORAS_OBJETIVO_MES) * 100);

  const days = getDaysInMonth();

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Calendario de Turnos</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus turnos de trabajo</p>
          </div>
          
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setSelectedCompany(1)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCompany === 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {companyNames[1]}
            </button>
            <button
              onClick={() => setSelectedCompany(2)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCompany === 2 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {companyNames[2]}
            </button>
            <button
              onClick={() => setSelectedCompany(3)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCompany === 3 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {companyNames[3]}
            </button>
            <button onClick={() => setShowCompanyModal(true)} className="p-1.5 hover:bg-muted rounded">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTemplateModal(true)} className="gap-1">
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Crear Turno</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowHolidayModal(true)} className="gap-1">
              <CalendarPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Festivos</span>
            </Button>
            <Button 
              variant={deleteMode ? "destructive" : "outline"} 
              size="sm" 
              onClick={() => setDeleteMode(!deleteMode)} 
              className="gap-1"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{deleteMode ? "Cancelar" : "Eliminar"}</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-secondary rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-lg font-semibold min-w-[140px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-secondary rounded">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Mode Banner */}
      {deleteMode && (
        <div className="p-3 bg-red-500 text-white rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">Modo Eliminar: Pulsa en una casilla o turno para borrarlo</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setDeleteMode(false)}>
            Terminar
          </Button>
        </div>
      )}

      {/* Quick Templates Bar */}
      {shiftTemplates.length > 0 && !deleteMode && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg overflow-x-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Zap className="w-3 h-3" /> Aplicar:
          </span>
          {shiftTemplates.map(t => (
            <button
              key={t.id}
              onClick={() => setQuickApplyTemplate(quickApplyTemplate?.id === t.id ? null : t)}
              className={`px-3 py-1.5 rounded text-sm font-medium text-white whitespace-nowrap transition-all ${quickApplyTemplate?.id === t.id ? 'ring-2 ring-offset-2 ring-primary scale-105' : ''}`}
              style={{ backgroundColor: t.color }}
            >
              {t.symbol && t.symbol !== "none" && <span className="mr-1">{t.symbol}</span>}
              {t.name}
            </button>
          ))}
          {quickApplyTemplate && (
            <span className="text-xs text-green-600 dark:text-green-400 ml-2">
              ✓ Pulsa en un día para añadir "{quickApplyTemplate.name}"
            </span>
          )}
        </div>
      )}

      {/* Cumplimiento Jornada */}
      <div className={`p-3 sm:p-4 rounded-lg border-2 ${cumpleJornada ? 'bg-green-50 dark:bg-green-950/30 border-green-500' : 'bg-red-50 dark:bg-red-950/30 border-red-500'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Target className={`w-5 h-5 ${cumpleJornada ? 'text-green-600' : 'text-red-600'}`} />
            <span className="font-semibold text-sm sm:text-base">Cumplimiento de Jornada ({companyNames[selectedCompany]})</span>
          </div>
          <div className="text-right">
            <span className={`text-xl sm:text-2xl font-bold tabular-nums ${cumpleJornada ? 'text-green-600' : 'text-red-600'}`}>
              {horasComputadas.toFixed(1)}h
            </span>
            <span className="text-muted-foreground text-sm"> / {HORAS_OBJETIVO_MES}h</span>
          </div>
        </div>
        <Progress value={progressPercent} className={`h-2 sm:h-3 ${cumpleJornada ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`} />
        <div className="mt-2 flex flex-col sm:flex-row sm:justify-between gap-1 text-xs sm:text-sm">
          {cumpleJornada ? (
            <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">¡Jornada cumplida!</span>
              {horasExtrasRealizadas > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded text-xs font-bold">
                  +{horasExtrasRealizadas.toFixed(1)}h extras
                </span>
              )}
            </div>
          ) : (
            <span className="text-red-700 dark:text-red-400 font-medium">
              Faltan {horasFaltantes.toFixed(1)}h para cumplir
            </span>
          )}
          <span className="text-muted-foreground text-xs">Objetivo: 162h/mes</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="stat-card p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-base sm:text-xl font-bold tabular-nums">{monthStats.totalHours.toFixed(1)}h</p>
        </div>
        <div className="stat-card p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Moon className="w-3 h-3" /> Noct.
          </p>
          <p className="text-base sm:text-xl font-bold tabular-nums">{monthStats.nightHours.toFixed(1)}h</p>
        </div>
        <div className="stat-card p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <SunIcon className="w-3 h-3" /> Fest.
          </p>
          <p className="text-base sm:text-xl font-bold tabular-nums">{monthStats.holidayHours.toFixed(1)}h</p>
        </div>
        <div className="stat-card p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Turnos</p>
          <p className="text-base sm:text-xl font-bold tabular-nums">{monthStats.shiftsCount}</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="border rounded-md overflow-hidden bg-card -mx-2 sm:mx-0">
        <div className="grid grid-cols-7">
          {DAYS.map((day, i) => (
            <div 
              key={day} 
              className={`py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider border-b ${
                i === 5 ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30" : 
                i === 6 ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30" : 
                "text-muted-foreground bg-muted"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="spinner" />
          </div>
        ) : (
          <div className="calendar-grid-xl">
            {days.map((day, index) => (
              <div
                key={`day-${index}-${day.date || 'empty'}`}
                onClick={() => day.currentMonth && handleQuickDayClick(day)}
                className={`calendar-day-xl ${!day.currentMonth ? "opacity-30 cursor-default" : "cursor-pointer hover:bg-muted/50"} 
                  ${day.isToday ? "ring-2 ring-inset ring-primary" : ""} 
                  ${day.isSaturday && !day.isNationalHoliday && !day.isLocalHoliday ? "bg-blue-50 dark:bg-blue-950/20" : ""} 
                  ${day.isSunday && !day.isNationalHoliday && !day.isLocalHoliday ? "bg-red-50 dark:bg-red-950/20" : ""} 
                  ${day.isNationalHoliday ? "bg-orange-100 dark:bg-orange-950/30" : ""} 
                  ${day.isLocalHoliday && !day.isNationalHoliday ? "bg-purple-100 dark:bg-purple-950/30" : ""}
                  ${deleteMode ? "hover:bg-red-100 dark:hover:bg-red-950/30" : ""}
                  ${quickApplyTemplate && !deleteMode ? "hover:ring-2 hover:ring-primary" : ""}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm sm:text-base font-medium
                    ${day.isToday ? "bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center" : ""} 
                    ${day.isSaturday && !day.isToday ? "text-blue-600 dark:text-blue-400" : ""} 
                    ${day.isSunday && !day.isToday ? "text-red-600 dark:text-red-400" : ""} 
                    ${day.isNationalHoliday && !day.isToday ? "text-orange-700 dark:text-orange-400 font-bold" : ""}
                    ${day.isLocalHoliday && !day.isNationalHoliday && !day.isToday ? "text-purple-700 dark:text-purple-400 font-bold" : ""}`}>
                    {day.day}
                  </span>
                  {day.shifts?.some(s => s.comment) && (
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="shifts-container-xl">
                  {day.shifts?.map((shift) => (
                    <div
                      key={shift.id}
                      className={`shift-chip-xl ${deleteMode ? 'ring-2 ring-red-500' : ''}`}
                      style={{ backgroundColor: shift.color }}
                      onClick={(e) => handleEditShift(e, shift)}
                    >
                      <div className="shift-time-row">
                        {shift.symbol && <span className="shift-symbol">{shift.symbol}</span>}
                        {!shift.label && shift.alarm_enabled && <Bell className="shift-icon" />}
                        {shift.label && shift.label.trim() !== "" ? (
                          <span className="shift-label">{shift.label}</span>
                        ) : (
                          <span className="shift-time-main">{shift.start_time.slice(0,5)}-{shift.end_time.slice(0,5)}</span>
                        )}
                        {!shift.label && shift.night_hours > 0 && <Moon className="shift-icon ml-auto" />}
                        {!shift.label && shift.comment && <MessageSquare className="shift-icon opacity-75" />}
                      </div>
                      {shift.start_time_2 && shift.end_time_2 && (
                        <div className="shift-time-secondary">
                          +{shift.start_time_2.slice(0,5)}-{shift.end_time_2.slice(0,5)}
                        </div>
                      )}
                      {/* Indicador de horas extras */}
                      {shift.overtime_hours > 0 && (
                        <div className="overtime-indicator" title={`+${shift.overtime_hours}h extras`}>
                          €
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-950/50 border border-blue-300" />
          <span className="text-muted-foreground">Sábado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-950/50 border border-red-300" />
          <span className="text-muted-foreground">Domingo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-orange-100 dark:bg-orange-950/50 border border-orange-300" />
          <span className="text-muted-foreground">Festivo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Comentario</span>
        </div>
      </div>

      {/* Shift Modal - Simplified */}
      <Dialog open={showModal} onOpenChange={(open) => { setShowModal(open); if (!open) setSelectedDate(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Editar Turno" : "Añadir Turno"} - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          
          {!editingShift && shiftTemplates.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Aplicar turno guardado:</p>
              <div className="flex flex-wrap gap-2">
                {shiftTemplates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 rounded text-sm font-medium text-white hover:opacity-90"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.symbol && t.symbol !== "none" && <span className="mr-1">{t.symbol}</span>}
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {!editingShift && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-2 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Turnos Especiales:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickShift('vacaciones')}
                  className="px-3 py-2 rounded text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  Vacaciones
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShift('incapacidad_temporal')}
                  className="px-3 py-2 rounded text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                >
                  IT
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShift('accidente_trabajo')}
                  className="px-3 py-2 rounded text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  AT
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShift('permiso_retribuido')}
                  className="px-3 py-2 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  Permiso Ret.
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickShift('asuntos_propios')}
                  className="px-3 py-2 rounded text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                >
                  Asuntos P.
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Los turnos especiales se añaden automáticamente con las horas del convenio</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">Etiqueta del Turno (Máx. 3 caracteres)</Label>
              <Input
                type="text"
                maxLength={3}
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value.toUpperCase() })}
                placeholder="Ej: M, T, N"
                className="text-center font-bold text-lg"
              />
              <p className="text-xs text-muted-foreground">Esta etiqueta aparecerá en la casilla del calendario en lugar de las horas</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold">Horario Principal</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Entrada</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Salida</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border-2 border-dashed">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs uppercase font-semibold">Segundo Turno (Opcional)</Label>
                <Switch checked={isTurnoPartido} onCheckedChange={setIsTurnoPartido} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Entrada</Label>
                  <Input
                    type="time"
                    value={formData.start_time_2}
                    onChange={(e) => setFormData({ ...formData, start_time_2: e.target.value })}
                    disabled={!isTurnoPartido}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Salida</Label>
                  <Input
                    type="time"
                    value={formData.end_time_2}
                    onChange={(e) => setFormData({ ...formData, end_time_2: e.target.value })}
                    disabled={!isTurnoPartido}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Activa el switch para habilitar el segundo turno</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold">Símbolo</Label>
                <Select value={formData.symbol} onValueChange={(value) => setFormData({ ...formData, symbol: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin símbolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_SYMBOLS.map((sym) => (
                      <SelectItem key={sym.id} value={sym.id}>{sym.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs uppercase font-semibold">Horas Extra</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.overtime_hours}
                  onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {SHIFT_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.id })}
                    className={`w-8 h-8 rounded cursor-pointer border-2 transition-transform hover:scale-110 ${formData.color === color.id ? "border-foreground scale-110 ring-2 ring-offset-1" : "border-muted"}`}
                    style={{ backgroundColor: color.id }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-semibold">Comentario</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Añade una nota..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formData.alarm_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, alarm_enabled: checked })}
              />
              <Label className="flex items-center gap-1 cursor-pointer text-sm">
                <Bell className="w-4 h-4" />
                Alarma 1h antes
              </Label>
            </div>

            <DialogFooter className="gap-2">
              {editingShift && (
                <Button type="button" variant="destructive" onClick={(e) => { handleDeleteShift(e, editingShift.id); setShowModal(false); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); setSelectedDate(null); }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingShift ? "Guardar" : "Añadir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Local Holidays Modal */}
      <Dialog open={showHolidayModal} onOpenChange={setShowHolidayModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5" />
              Festivos Locales
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input type="text" placeholder="Ej: San Jorge" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddLocalHoliday} className="w-full" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Añadir Festivo
            </Button>

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Festivos añadidos:</p>
              {localHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay festivos locales</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {localHolidays.map((h) => (
                    <div key={h.date} className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/30 p-2 rounded text-sm">
                      <div>
                        <span className="font-medium">{h.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{h.date}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveLocalHoliday(h.date)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Modal */}
      <Dialog open={showTemplateModal} onOpenChange={(open) => { setShowTemplateModal(open); if (!open) { setEditingTemplate(null); setTemplateForm({ name: "", start_time: "08:00", end_time: "14:00", start_time_2: "", end_time_2: "", color: "#3B82F6", symbol: "none" }); }}}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              Gestionar Turnos
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="list">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">Turnos</TabsTrigger>
              <TabsTrigger value="create">{editingTemplate ? "Editar" : "Crear Turno"}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-3 pt-3">
              {shiftTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay turnos guardados.</p>
              ) : (
                shiftTemplates.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: t.color }} />
                      <div>
                        <p className="font-medium">{t.symbol && t.symbol !== "none" && <span className="mr-1">{t.symbol}</span>}{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.start_time}-{t.end_time}
                          {t.start_time_2 && t.end_time_2 && ` / ${t.start_time_2}-${t.end_time_2}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(t)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(t.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="create" className="space-y-4 pt-3">
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div>
                  <Label className="text-xs uppercase">Nombre</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Ej: Mañana, Tarde, Noche..."
                    required
                  />
                </div>
                
                <div>
                  <Label className="text-xs uppercase">Etiqueta para Calendario (Máx. 3 caracteres)</Label>
                  <Input
                    maxLength={3}
                    value={templateForm.label}
                    onChange={(e) => setTemplateForm({ ...templateForm, label: e.target.value.toUpperCase() })}
                    placeholder="Ej: M, T, N"
                    className="text-center font-bold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Lo que aparecerá en la casilla del calendario</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Entrada</Label>
                    <Input
                      type="time"
                      value={templateForm.start_time}
                      onChange={(e) => setTemplateForm({ ...templateForm, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Salida</Label>
                    <Input
                      type="time"
                      value={templateForm.end_time}
                      onChange={(e) => setTemplateForm({ ...templateForm, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <Label className="text-xs uppercase">Segundo Turno (Opcional)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="time"
                      value={templateForm.start_time_2}
                      onChange={(e) => setTemplateForm({ ...templateForm, start_time_2: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={templateForm.end_time_2}
                      onChange={(e) => setTemplateForm({ ...templateForm, end_time_2: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs uppercase">Símbolo</Label>
                    <Select
                      value={templateForm.symbol}
                      onValueChange={(value) => setTemplateForm({ ...templateForm, symbol: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sin símbolo" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_SYMBOLS.map((sym) => (
                          <SelectItem key={sym.id} value={sym.id}>{sym.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase">Color</Label>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {SHIFT_COLORS.slice(0, 5).map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => setTemplateForm({ ...templateForm, color: color.id })}
                          className={`w-6 h-6 rounded border-2 ${templateForm.color === color.id ? "border-foreground ring-1" : "border-transparent"}`}
                          style={{ backgroundColor: color.id }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  {editingTemplate ? "Guardar Cambios" : "Crear Turno"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Company Settings Modal */}
      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Configurar Empresas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tres calendarios independientes para cada empresa.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase">Empresa 1</Label>
                <Input
                  value={companyNames[1]}
                  onChange={(e) => setCompanyNames(prev => ({ ...prev, 1: e.target.value }))}
                  onBlur={() => handleUpdateCompanyName(1, companyNames[1])}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs uppercase">Empresa 2</Label>
                <Input
                  value={companyNames[2]}
                  onChange={(e) => setCompanyNames(prev => ({ ...prev, 2: e.target.value }))}
                  onBlur={() => handleUpdateCompanyName(2, companyNames[2])}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs uppercase">Empresa 3</Label>
                <Input
                  value={companyNames[3]}
                  onChange={(e) => setCompanyNames(prev => ({ ...prev, 3: e.target.value }))}
                  onBlur={() => handleUpdateCompanyName(3, companyNames[3])}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
