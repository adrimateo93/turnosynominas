import React, { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, User, Briefcase, Clock, Award, Bell, BellRing, Percent, Receipt, Building2, BadgeEuro } from "lucide-react";

const CATEGORIES = [
  { id: "vigilante_sin_arma", name: "Vigilante de Seguridad Sin Arma" },
  { id: "vigilante_con_arma", name: "Vigilante de Seguridad Con Arma" },
  { id: "vigilante_transporte_conductor", name: "V.S. Transporte - Conductor" },
  { id: "vigilante_transporte", name: "V.S. Transporte" },
  { id: "vigilante_explosivos_conductor", name: "V.S.T. Explosivos Conductor" },
  { id: "vigilante_explosivos", name: "V.S. Transp - Explosivos" },
  { id: "vigilante_seguridad_explosivos", name: "V.S. Explosivos" },
  { id: "escolta", name: "Escolta" },
  { id: "operador_seguridad", name: "Operador de Seguridad" },
  { id: "contador_pagador", name: "Contador - Pagador" }
];

const JORNADA_OPTIONS = [
  { value: 100, label: "100% - Jornada Completa (1782h/año)" },
  { value: 75, label: "75% - Tres Cuartos (1336.5h/año)" },
  { value: 50, label: "50% - Media Jornada (891h/año)" },
  { value: 25, label: "25% - Cuarto de Jornada (445.5h/año)" }
];

const IRPF_PRESETS = [
  { value: 2, label: "2% (mínimo)" },
  { value: 8, label: "8%" },
  { value: 12, label: "12%" },
  { value: 15, label: "15%" },
  { value: 19, label: "19%" },
  { value: 24, label: "24%" }
];

export default function Settings() {
  const { authAxios, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    categoria: "vigilante_sin_arma",
    porcentaje_jornada: 100,
    trienios: 0,
    quinquenios: 0,
    ano_entrada_empresa: 0,
    es_responsable_equipo: false,
    horas_anuales: 1782,
    meses_trabajo: 11,
    pagas_prorrateadas: true,
    tipo_contrato: "indefinido",
    irpf_porcentaje: 15.0,
    horas_extra_fuerza_mayor: false,
    plus_servicio_nombre: "",
    plus_servicio_importe: 0,
    // Pluses del convenio
    plus_kilometraje_km: 0,
    plus_aeropuerto_horas: 0,
    plus_radioscopia_aeroportuaria_horas: 0,
    plus_filtro_rotacion_horas: 0,
    plus_radioscopia_basica_horas: 0,
    plus_escolta_horas: 0,
    plus_nochebuena: false,
    plus_nochevieja: false,
    plus_asistencia_juicio_horas: 0,
    plus_formacion_horas: 0,
    plus_asistencia_tiro_horas: 0,
    plus_hijo_discapacitado: false,
    // Dietas
    dieta_una_comida: 0,
    dieta_dos_comidas: 0,
    dieta_pernocta_desayuno: 0,
    dieta_pernocta_dos_comidas: 0,
    dieta_completa_8_dia: 0
  });
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await authAxios.get("/settings");
        setSettings(prev => ({ ...prev, ...response.data }));
        const salaryResponse = await authAxios.get(`/salary-table/${response.data.categoria}`);
        setSalaryInfo(salaryResponse.data);
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Error al cargar configuración");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
    
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSwRegistration(registration);
      });
    }
  }, [authAxios]);

  const handleCategoryChange = async (categoria) => {
    setSettings({ ...settings, categoria });
    try {
      const salaryResponse = await authAxios.get(`/salary-table/${categoria}`);
      setSalaryInfo(salaryResponse.data);
    } catch (error) {
      console.error("Error fetching salary info:", error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await authAxios.put("/settings", settings);
      toast.success("Configuración guardada");
    } catch (error) {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success("Notificaciones activadas");
        if (swRegistration) {
          swRegistration.showNotification('SeguriTurno', {
            body: '¡Las notificaciones están activadas!',
            icon: 'https://customer-assets.emergentagent.com/job_7ef7a8b4-f925-49e3-b2a6-713ab2418e30/artifacts/u2v9fpdi_seguriturnos%20icono.png',
            vibrate: [200, 100, 200]
          });
        }
      } else {
        toast.error("Notificaciones denegadas");
      }
    }
  };

  const horasMesBase = settings.horas_anuales / settings.meses_trabajo;
  const horasMesConJornada = (horasMesBase * settings.porcentaje_jornada) / 100;

  // Calculate paga extra preview
  const pagaExtraBase = salaryInfo ? 
    (salaryInfo.salario_base + (salaryInfo.trienio * settings.trienios) + (salaryInfo.quinquenio * settings.quinquenios) + salaryInfo.plus_peligrosidad) * (settings.porcentaje_jornada / 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Ajustes</h1>
          <p className="text-muted-foreground">Configura tu perfil, fiscalidad y categoría profesional</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="save-settings-top-btn">
          {saving ? (
            <>
              <span className="spinner w-4 h-4" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil
            </CardTitle>
            <CardDescription>Tu información personal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Nombre</Label>
              <Input value={user?.name || ""} disabled data-testid="profile-name" />
            </div>
            <div className="space-y-2">
              <Label className="form-label">Email</Label>
              <Input value={user?.email || ""} disabled data-testid="profile-email" />
            </div>
          </CardContent>
        </Card>

        {/* Work Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Jornada Laboral
            </CardTitle>
            <CardDescription>1782 horas/año en 11 meses de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Porcentaje de Jornada</Label>
              <Select
                value={String(settings.porcentaje_jornada)}
                onValueChange={(value) => setSettings({ ...settings, porcentaje_jornada: parseInt(value) })}
              >
                <SelectTrigger data-testid="jornada-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JORNADA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 rounded-md bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Horas anuales:</span>
                <span className="font-medium tabular-nums">{(settings.horas_anuales * settings.porcentaje_jornada / 100).toFixed(0)}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Horas/mes base:</span>
                <span className="font-medium tabular-nums">{horasMesConJornada.toFixed(1)}h</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="form-label">Responsable de Equipo (+10%)</Label>
              <Switch
                checked={settings.es_responsable_equipo}
                onCheckedChange={(checked) => setSettings({ ...settings, es_responsable_equipo: checked })}
                data-testid="responsable-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contract & Taxes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Contrato y Fiscalidad
            </CardTitle>
            <CardDescription>Configura las retenciones de tu nómina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Tipo de Contrato</Label>
              <RadioGroup
                value={settings.tipo_contrato}
                onValueChange={(value) => setSettings({ ...settings, tipo_contrato: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="indefinido" id="indefinido" />
                  <Label htmlFor="indefinido" className="cursor-pointer">Indefinido</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="temporal" id="temporal" />
                  <Label htmlFor="temporal" className="cursor-pointer">Temporal</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Desempleo: {settings.tipo_contrato === "indefinido" ? "1,55%" : "1,60%"} trabajador
              </p>
            </div>

            <div className="space-y-2">
              <Label className="form-label">IRPF (%)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  max="47"
                  step="0.1"
                  value={settings.irpf_porcentaje}
                  onChange={(e) => setSettings({ ...settings, irpf_porcentaje: parseFloat(e.target.value) || 0 })}
                  className="w-24"
                  data-testid="irpf-input"
                />
                <Select
                  value=""
                  onValueChange={(value) => setSettings({ ...settings, irpf_porcentaje: parseFloat(value) })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Presets..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IRPF_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={String(preset.value)}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="form-label">Horas Extra Fuerza Mayor</Label>
                <p className="text-xs text-muted-foreground">
                  {settings.horas_extra_fuerza_mayor ? "2% retención" : "4,70% retención"}
                </p>
              </div>
              <Switch
                checked={settings.horas_extra_fuerza_mayor}
                onCheckedChange={(checked) => setSettings({ ...settings, horas_extra_fuerza_mayor: checked })}
                data-testid="horas-extra-switch"
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Deducciones SS trabajador:</strong><br/>
                • Contingencias Comunes: 4,70%<br/>
                • Formación Profesional: 0,10%<br/>
                • MEI 2026: 0,13%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pagas Extras Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Pagas Extras
            </CardTitle>
            <CardDescription>3 pagas extras: Marzo, Julio y Diciembre</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Forma de Cobro</Label>
              <RadioGroup
                value={settings.pagas_prorrateadas ? "prorrateadas" : "integras"}
                onValueChange={(value) => setSettings({ ...settings, pagas_prorrateadas: value === "prorrateadas" })}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="prorrateadas" id="prorrateadas" />
                  <Label htmlFor="prorrateadas" className="cursor-pointer">
                    <span className="font-medium">Prorrateadas</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({((pagaExtraBase * 3) / 12).toFixed(2)} €/mes extra)
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="integras" id="integras" />
                  <Label htmlFor="integras" className="cursor-pointer">
                    <span className="font-medium">Íntegras</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      (en marzo, julio, diciembre)
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="p-3 rounded-md bg-muted/50 space-y-1">
              <p className="text-sm font-medium">Composición de cada paga extra:</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Salario Base:</span>
                  <span className="tabular-nums">{salaryInfo ? (salaryInfo.salario_base * settings.porcentaje_jornada / 100).toFixed(2) : 0} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Plus Antigüedad:</span>
                  <span className="tabular-nums">{salaryInfo ? ((salaryInfo.trienio * settings.trienios + salaryInfo.quinquenio * settings.quinquenios) * settings.porcentaje_jornada / 100).toFixed(2) : 0} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Plus Peligrosidad:</span>
                  <span className="tabular-nums">{salaryInfo ? (salaryInfo.plus_peligrosidad * settings.porcentaje_jornada / 100).toFixed(2) : 0} €</span>
                </div>
                <div className="flex justify-between pt-1 border-t font-medium">
                  <span>Total paga extra:</span>
                  <span className="tabular-nums text-primary">{pagaExtraBase.toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Categoría Profesional
            </CardTitle>
            <CardDescription>Según el convenio de seguridad privada 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Categoría</Label>
              <Select
                value={settings.categoria}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger data-testid="categoria-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {salaryInfo && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="text-sm font-semibold">Información Salarial</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Salario Base:</span>
                  <span className="text-right tabular-nums font-medium">{salaryInfo.salario_base.toFixed(2)} €</span>
                  <span className="text-muted-foreground">Plus Peligrosidad:</span>
                  <span className="text-right tabular-nums font-medium">{salaryInfo.plus_peligrosidad.toFixed(2)} €</span>
                  <span className="text-muted-foreground">Plus Transporte:</span>
                  <span className="text-right tabular-nums font-medium">{salaryInfo.plus_transporte.toFixed(2)} €</span>
                  <div className="col-span-2 pt-2 border-t flex justify-between">
                    <span className="font-semibold">Salario Total Mes:</span>
                    <span className="tabular-nums font-bold text-primary">{salaryInfo.salario_total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seniority Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Antigüedad
            </CardTitle>
            <CardDescription>Trienios y quinquenios acumulados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Año de entrada en la empresa</Label>
              <Input
                type="number"
                min="1990"
                max={new Date().getFullYear()}
                placeholder="Ej: 2020"
                value={settings.ano_entrada_empresa || ""}
                onChange={(e) => {
                  const anoEntrada = parseInt(e.target.value) || 0;
                  if (anoEntrada > 0) {
                    const anoActual = new Date().getFullYear();
                    let trienios = 0;
                    let quinquenios = 0;
                    
                    // Trienios solo cuentan hasta 1994
                    if (anoEntrada <= 1994) {
                      const anosHasta1994 = 1994 - anoEntrada;
                      trienios = Math.floor(anosHasta1994 / 3);
                      
                      // Quinquenios desde 1994 hasta ahora
                      const anosDespues1994 = anoActual - 1994;
                      quinquenios = Math.floor(anosDespues1994 / 5);
                    } else {
                      // Si entró después de 1994, solo quinquenios
                      const anosAntiguedad = anoActual - anoEntrada;
                      quinquenios = Math.floor(anosAntiguedad / 5);
                    }
                    
                    setSettings({ 
                      ...settings, 
                      ano_entrada_empresa: anoEntrada,
                      trienios: trienios,
                      quinquenios: quinquenios
                    });
                  } else {
                    setSettings({ ...settings, ano_entrada_empresa: anoEntrada });
                  }
                }}
                data-testid="ano-entrada-input"
              />
              {settings.ano_entrada_empresa > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Antigüedad: {new Date().getFullYear() - settings.ano_entrada_empresa} años → {settings.trienios} trienio(s) y {settings.quinquenios} quinquenio(s)
                </p>
              )}
            </div>
            
            <div className="p-3 rounded-md bg-muted/50 border-2 border-dashed space-y-3">
              <p className="text-xs text-muted-foreground font-medium">O configura manualmente:</p>
              <div className="space-y-2">
                <Label className="form-label text-xs">Trienios (cada 3 años)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={settings.trienios}
                  onChange={(e) => setSettings({ ...settings, trienios: parseInt(e.target.value) || 0 })}
                  data-testid="trienios-input"
                />
                {salaryInfo && settings.trienios > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{(salaryInfo.trienio * settings.trienios * settings.porcentaje_jornada / 100).toFixed(2)} €/mes
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="form-label text-xs">Quinquenios (cada 5 años)</Label>
                <Input
                  type="number"
                  min="0"
                  max="6"
                  value={settings.quinquenios}
                  onChange={(e) => setSettings({ ...settings, quinquenios: parseInt(e.target.value) || 0 })}
                  data-testid="quinquenios-input"
                />
                {salaryInfo && settings.quinquenios > 0 && (
                  <p className="text-xs text-muted-foreground">
                    +{(salaryInfo.quinquenio * settings.quinquenios * settings.porcentaje_jornada / 100).toFixed(2)} €/mes
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plus Servicio Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeEuro className="w-5 h-5" />
              Plus de Servicio
            </CardTitle>
            <CardDescription>Plus específico según tu servicio o cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="form-label">Nombre del Plus</Label>
              <Input
                type="text"
                placeholder="Ej: Plus Aeropuerto, Plus Cliente X..."
                value={settings.plus_servicio_nombre || ""}
                onChange={(e) => setSettings({ ...settings, plus_servicio_nombre: e.target.value })}
                data-testid="plus-servicio-nombre"
              />
            </div>
            <div className="space-y-2">
              <Label className="form-label">Importe Mensual (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={settings.plus_servicio_importe || ""}
                onChange={(e) => setSettings({ ...settings, plus_servicio_importe: parseFloat(e.target.value) || 0 })}
                data-testid="plus-servicio-importe"
              />
              {settings.plus_servicio_importe > 0 && (
                <p className="text-xs text-muted-foreground">
                  Se añadirá al salario bruto y cotizará a la Seguridad Social
                </p>
              )}
            </div>
            
            {settings.plus_servicio_importe > 0 && (
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {settings.plus_servicio_nombre || "Plus Servicio"}
                  </span>
                  <span className="tabular-nums font-bold text-green-700 dark:text-green-300">
                    +{settings.plus_servicio_importe.toFixed(2)} €/mes
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pluses Convenio Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BadgeEuro className="w-5 h-5" />
              Pluses del Convenio
            </CardTitle>
            <CardDescription>Indica las horas o cantidades para calcular cada plus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Plus Kilometraje */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Kilometraje</Label>
                <p className="text-xs text-muted-foreground">0,35 €/km</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Km"
                    value={settings.plus_kilometraje_km || ""}
                    onChange={(e) => setSettings({ ...settings, plus_kilometraje_km: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">km</span>
                  {settings.plus_kilometraje_km > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_kilometraje_km * 0.35).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Aeropuerto */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Aeropuerto</Label>
                <p className="text-xs text-muted-foreground">0,82 €/hora</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_aeropuerto_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_aeropuerto_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_aeropuerto_horas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_aeropuerto_horas * 0.82).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Radioscopia Aeroportuaria */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Radioscopia Aeroportuaria</Label>
                <p className="text-xs text-muted-foreground">1,46 €/hora</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_radioscopia_aeroportuaria_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_radioscopia_aeroportuaria_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_radioscopia_aeroportuaria_horas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_radioscopia_aeroportuaria_horas * 1.46).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Filtro/Rotación */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Filtro/Rotación</Label>
                <p className="text-xs text-muted-foreground">0,74 €/hora</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_filtro_rotacion_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_filtro_rotacion_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_filtro_rotacion_horas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_filtro_rotacion_horas * 0.74).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Radioscopia Básica */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Radioscopia Básica</Label>
                <p className="text-xs text-muted-foreground">0,21 €/hora (tope 236,52 €/mes)</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_radioscopia_basica_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_radioscopia_basica_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_radioscopia_basica_horas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{Math.min(settings.plus_radioscopia_basica_horas * 0.21, 236.52).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Escolta */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Escolta</Label>
                <p className="text-xs text-muted-foreground">1,93 €/hora</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_escolta_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_escolta_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_escolta_horas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_escolta_horas * 1.93).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Nochebuena */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Nochebuena</Label>
                <p className="text-xs text-muted-foreground">83,48 € por noche</p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.plus_nochebuena}
                    onCheckedChange={(checked) => setSettings({ ...settings, plus_nochebuena: checked })}
                  />
                  <span className="text-sm">{settings.plus_nochebuena ? "Sí" : "No"}</span>
                  {settings.plus_nochebuena && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +83,48 €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Nochevieja */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Nochevieja</Label>
                <p className="text-xs text-muted-foreground">83,48 € por noche</p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.plus_nochevieja}
                    onCheckedChange={(checked) => setSettings({ ...settings, plus_nochevieja: checked })}
                  />
                  <span className="text-sm">{settings.plus_nochevieja ? "Sí" : "No"}</span>
                  {settings.plus_nochevieja && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +83,48 €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Asistencia a Juicio */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Asistencia a Juicio</Label>
                <p className="text-xs text-muted-foreground">
                  {settings.categoria === 'vigilante_con_arma' || settings.categoria === 'guarda_rural' ? '11,28' : 
                   settings.categoria === 'escolta' ? '11,13' :
                   settings.categoria === 'vigilante_explosivos' ? '11,55' :
                   settings.categoria === 'vigilante_transporte_explosivos' ? '12,18' :
                   settings.categoria === 'vigilante_transporte' ? '11,84' :
                   settings.categoria === 'vigilante_transporte_conductor' ? '12,52' :
                   settings.categoria === 'operador_seguridad' ? '9,07' :
                   settings.categoria === 'contador_pagador' ? '8,96' :
                   '9,98'} €/hora + antigüedad por hora
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_asistencia_juicio_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_asistencia_juicio_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_asistencia_juicio_horas > 0 && salaryInfo && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_asistencia_juicio_horas * (
                        (settings.categoria === 'vigilante_con_arma' || settings.categoria === 'guarda_rural' ? 11.28 : 
                         settings.categoria === 'escolta' ? 11.13 :
                         settings.categoria === 'vigilante_explosivos' ? 11.55 :
                         settings.categoria === 'vigilante_transporte_explosivos' ? 12.18 :
                         settings.categoria === 'vigilante_transporte' ? 11.84 :
                         settings.categoria === 'vigilante_transporte_conductor' ? 12.52 :
                         settings.categoria === 'operador_seguridad' ? 9.07 :
                         settings.categoria === 'contador_pagador' ? 8.96 :
                         9.98) + 
                        ((salaryInfo.trienio * settings.trienios) + (salaryInfo.quinquenio * settings.quinquenios)) / horasMesConJornada
                      )).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Hijo Discapacitado */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Hijo/a Discapacitado/a</Label>
                <p className="text-xs text-muted-foreground">150,70 €/mes</p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={settings.plus_hijo_discapacitado}
                    onCheckedChange={(checked) => setSettings({ ...settings, plus_hijo_discapacitado: checked })}
                  />
                  <span className="text-sm">{settings.plus_hijo_discapacitado ? "Sí" : "No"}</span>
                  {settings.plus_hijo_discapacitado && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +150,70 €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Formación */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Formación</Label>
                <p className="text-xs text-muted-foreground">9,98 €/hora + antigüedad por hora</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_formacion_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_formacion_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_formacion_horas > 0 && salaryInfo && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_formacion_horas * (
                        9.98 + ((salaryInfo.trienio * settings.trienios) + (salaryInfo.quinquenio * settings.quinquenios)) / horasMesConJornada
                      )).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Plus Asistencia a Tiro */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Plus Asistencia a Tiro</Label>
                <p className="text-xs text-muted-foreground">9,98 €/hora + antigüedad por hora</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Horas"
                    value={settings.plus_asistencia_tiro_horas || ""}
                    onChange={(e) => setSettings({ ...settings, plus_asistencia_tiro_horas: parseFloat(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                  {settings.plus_asistencia_tiro_horas > 0 && salaryInfo && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.plus_asistencia_tiro_horas * (
                        9.98 + ((salaryInfo.trienio * settings.trienios) + (salaryInfo.quinquenio * settings.quinquenios)) / horasMesConJornada
                      )).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dietas Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Dietas
            </CardTitle>
            <CardDescription>Indica cuántas dietas de cada tipo has tenido este mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Una comida */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Una comida</Label>
                <p className="text-xs text-muted-foreground">11,93 €/dieta</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Cantidad"
                    value={settings.dieta_una_comida || ""}
                    onChange={(e) => setSettings({ ...settings, dieta_una_comida: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">veces</span>
                  {settings.dieta_una_comida > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.dieta_una_comida * 11.93).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Dos comidas */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Dos comidas</Label>
                <p className="text-xs text-muted-foreground">22,00 €/dieta</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Cantidad"
                    value={settings.dieta_dos_comidas || ""}
                    onChange={(e) => setSettings({ ...settings, dieta_dos_comidas: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">veces</span>
                  {settings.dieta_dos_comidas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.dieta_dos_comidas * 22.00).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Pernocta y desayuno */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Pernoctación y desayuno</Label>
                <p className="text-xs text-muted-foreground">20,18 €/dieta</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Cantidad"
                    value={settings.dieta_pernocta_desayuno || ""}
                    onChange={(e) => setSettings({ ...settings, dieta_pernocta_desayuno: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">veces</span>
                  {settings.dieta_pernocta_desayuno > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.dieta_pernocta_desayuno * 20.18).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Pernocta y dos comidas */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Pernoctación y dos comidas</Label>
                <p className="text-xs text-muted-foreground">40,35 €/dieta</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Cantidad"
                    value={settings.dieta_pernocta_dos_comidas || ""}
                    onChange={(e) => setSettings({ ...settings, dieta_pernocta_dos_comidas: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">veces</span>
                  {settings.dieta_pernocta_dos_comidas > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.dieta_pernocta_dos_comidas * 40.35).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>

              {/* Dieta completa 8º día */}
              <div className="space-y-2 p-3 rounded-lg border">
                <Label className="text-sm font-medium">Dieta Completa tras 8º día</Label>
                <p className="text-xs text-muted-foreground">32,07 €/día</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Días"
                    value={settings.dieta_completa_8_dia || ""}
                    onChange={(e) => setSettings({ ...settings, dieta_completa_8_dia: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">días</span>
                  {settings.dieta_completa_8_dia > 0 && (
                    <span className="text-sm font-medium text-green-600 ml-auto">
                      +{(settings.dieta_completa_8_dia * 32.07).toFixed(2)} €
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5" />
              Notificaciones Push
            </CardTitle>
            <CardDescription>Recibe alarmas 1 hora antes de tus turnos incluso con la app cerrada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Estado de notificaciones</p>
                <p className="text-xs text-muted-foreground">
                  {notificationPermission === 'granted' && 'Las notificaciones están activadas'}
                  {notificationPermission === 'denied' && 'Las notificaciones están bloqueadas en tu navegador'}
                  {notificationPermission === 'default' && 'Activa las notificaciones para recibir alarmas'}
                </p>
              </div>
              {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
                <Button onClick={requestNotificationPermission} variant="outline" className="gap-2" data-testid="enable-notifications-btn">
                  <Bell className="w-4 h-4" />
                  Activar
                </Button>
              )}
              {notificationPermission === 'granted' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Bell className="w-5 h-5" />
                  <span className="text-sm font-medium">Activadas</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2" data-testid="save-settings-btn">
          {saving ? (
            <>
              <span className="spinner w-4 h-4" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Configuración
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
