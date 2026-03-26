import React, { useState, useEffect } from "react";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Download, Calculator, Euro, Clock, Moon, Calendar, Target, Building2, User, TrendingDown, Gift, Settings2 } from "lucide-react";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function Payroll() {
  const { authAxios } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [payrollData, setPayrollData] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(() => {
    const saved = localStorage.getItem('selectedCompany');
    return saved ? parseInt(saved) : 1;
  });
  const [companyNames, setCompanyNames] = useState({ 1: "Empresa A", 2: "Empresa B" });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch company names
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await authAxios.get('/companies');
        const names = {};
        response.data.forEach(c => {
          names[c.company_number] = c.name;
        });
        setCompanyNames(names);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };
    fetchCompanies();
  }, [authAxios]);

  // Save selected company to localStorage
  useEffect(() => {
    localStorage.setItem('selectedCompany', selectedCompany.toString());
  }, [selectedCompany]);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setLoading(true);
        const response = await authAxios.get(`/payroll/${year}/${month + 1}?company_id=${selectedCompany}`);
        setPayrollData(response.data);
      } catch (error) {
        console.error("Error fetching payroll:", error);
        toast.error("Error al calcular nómina");
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [authAxios, year, month, selectedCompany]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Por favor permite las ventanas emergentes para exportar");
      return;
    }

    const d = payrollData?.desglose_bruto || {};
    const ded = payrollData?.deducciones_trabajador || {};
    const emp = payrollData?.costes_empresa || {};

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nómina ${MONTHS[month]} ${year} - SeguriTurno</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #000; font-size: 12px; }
          h1 { font-size: 20px; margin-bottom: 15px; }
          h2 { font-size: 14px; margin: 15px 0 8px; background: #f5f5f5; padding: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th, td { padding: 5px 8px; text-align: left; border: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: 600; }
          .right { text-align: right; }
          .total { font-weight: bold; background: #e8f5e9; }
          .negative { color: #c62828; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 10px; border-top: 1px solid #ddd; padding-top: 10px; }
          .columns { display: flex; gap: 20px; }
          .column { flex: 1; }
          .highlight { background: #fff3e0; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>NÓMINA - ${MONTHS[month].toUpperCase()} ${year}</h1>
            <p><strong>Categoría:</strong> ${payrollData?.categoria || '-'}</p>
            <p><strong>Contrato:</strong> ${payrollData?.tipo_contrato || 'indefinido'} | <strong>Jornada:</strong> ${payrollData?.porcentaje_jornada || 100}%</p>
          </div>
          <div style="text-align: right;">
            <p>Fecha: ${new Date().toLocaleDateString('es-ES')}</p>
            <p>Turnos: ${payrollData?.shifts_count || 0}</p>
          </div>
        </div>

        <div class="columns">
          <div class="column">
            <h2>DEVENGOS (Salario Bruto)</h2>
            <table>
              <tr><td>Salario Base</td><td class="right">${d.salario_base?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Plus Peligrosidad</td><td class="right">${d.plus_peligrosidad?.toFixed(2) || '0.00'} €</td></tr>
              ${d.plus_actividad > 0 ? `<tr><td>Plus Actividad</td><td class="right">${d.plus_actividad?.toFixed(2)} €</td></tr>` : ''}
              <tr><td>Plus Transporte</td><td class="right">${d.plus_transporte?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Plus Vestuario</td><td class="right">${d.plus_vestuario?.toFixed(2) || '0.00'} €</td></tr>
              ${d.plus_antiguedad > 0 ? `<tr><td>Plus Antigüedad</td><td class="right">${d.plus_antiguedad?.toFixed(2)} €</td></tr>` : ''}
              ${d.plus_responsable_equipo > 0 ? `<tr><td>Plus Responsable</td><td class="right">${d.plus_responsable_equipo?.toFixed(2)} €</td></tr>` : ''}
              <tr><td>Plus Nocturnidad (${payrollData?.horas?.nocturnas?.toFixed(1) || 0}h)</td><td class="right">${d.plus_nocturnidad?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Plus Festivo (${payrollData?.horas?.festivas?.toFixed(1) || 0}h)</td><td class="right">${d.plus_festivo?.toFixed(2) || '0.00'} €</td></tr>
              ${d.plus_servicio_importe > 0 ? `<tr style="background:#e8f5e9;"><td><strong>${d.plus_servicio_nombre || 'Plus Servicio'}</strong></td><td class="right"><strong>${d.plus_servicio_importe?.toFixed(2)} €</strong></td></tr>` : ''}
              ${d.paga_extra > 0 ? `<tr><td><strong>Paga Extra ${payrollData?.pagas_extras?.prorrateadas ? '(prorrateada)' : ''}</strong></td><td class="right"><strong>${d.paga_extra?.toFixed(2)} €</strong></td></tr>` : ''}
              <tr class="total"><td><strong>TOTAL BRUTO</strong></td><td class="right"><strong>${payrollData?.total_bruto?.toFixed(2) || '0.00'} €</strong></td></tr>
            </table>

            <h2>DEDUCCIONES TRABAJADOR</h2>
            <table>
              <tr><td>Contingencias Comunes (4,70%)</td><td class="right negative">-${ded.contingencias_comunes?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Desempleo (${payrollData?.tipo_contrato === 'indefinido' ? '1,55%' : '1,60%'})</td><td class="right negative">-${ded.desempleo?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Formación Profesional (0,10%)</td><td class="right negative">-${ded.formacion_profesional?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>MEI (0,13%)</td><td class="right negative">-${ded.mei?.toFixed(2) || '0.00'} €</td></tr>
              ${ded.horas_extras > 0 ? `<tr><td>Horas Extras</td><td class="right negative">-${ded.horas_extras?.toFixed(2)} €</td></tr>` : ''}
              <tr><td><strong>Total Seg. Social</strong></td><td class="right negative"><strong>-${ded.total_ss?.toFixed(2) || '0.00'} €</strong></td></tr>
              <tr><td>IRPF (${ded.irpf_porcentaje || 15}%)</td><td class="right negative">-${ded.irpf?.toFixed(2) || '0.00'} €</td></tr>
              <tr class="total"><td><strong>TOTAL DEDUCCIONES</strong></td><td class="right negative"><strong>-${ded.total?.toFixed(2) || '0.00'} €</strong></td></tr>
            </table>
          </div>

          <div class="column">
            <h2>COSTES EMPRESA</h2>
            <table>
              <tr><td>Contingencias Comunes (23,60%)</td><td class="right">${emp.contingencias_comunes?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Desempleo (${payrollData?.tipo_contrato === 'indefinido' ? '5,50%' : '6,70%'})</td><td class="right">${emp.desempleo?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>FOGASA (0,20%)</td><td class="right">${emp.fogasa?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>Formación Prof. (0,60%)</td><td class="right">${emp.formacion_profesional?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>AT y EP (~1,50%)</td><td class="right">${emp.at_ep?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td>MEI (0,58%)</td><td class="right">${emp.mei?.toFixed(2) || '0.00'} €</td></tr>
              <tr><td><strong>Total SS Empresa</strong></td><td class="right"><strong>${emp.total_ss?.toFixed(2) || '0.00'} €</strong></td></tr>
              <tr class="total"><td><strong>COSTE TOTAL EMPRESA</strong></td><td class="right"><strong>${emp.coste_total?.toFixed(2) || '0.00'} €</strong></td></tr>
            </table>

            <div class="highlight">
              <h2 style="margin-top:0;">LÍQUIDO A PERCIBIR</h2>
              <p style="font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0;">${payrollData?.salario_neto?.toFixed(2) || '0.00'} €</p>
            </div>

            <h2>RESUMEN HORAS</h2>
            <table>
              <tr><td>Horas Trabajadas</td><td class="right">${payrollData?.horas?.trabajadas?.toFixed(1) || 0}h</td></tr>
              <tr><td>Horas Nocturnas</td><td class="right">${payrollData?.horas?.nocturnas?.toFixed(1) || 0}h</td></tr>
              <tr><td>Horas Festivas</td><td class="right">${payrollData?.horas?.festivas?.toFixed(1) || 0}h</td></tr>
              <tr><td>Horas Extras</td><td class="right">${payrollData?.horas?.extras?.toFixed(1) || 0}h</td></tr>
            </table>
          </div>
        </div>

        <div class="footer">
          <p>Generado por SeguriTurno - Convenio Seguridad Privada 2026</p>
          <p>Base de cotización: ${payrollData?.base_cotizacion?.toFixed(2) || '0.00'} € | Jornada: 1782h/año (162h/mes en 11 meses)</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const horasObjetivo = payrollData?.jornada?.horas_mes_objetivo || 162;
  const horasComputadas = payrollData?.horas?.computadas || 0;
  const progressPercent = Math.min(100, (horasComputadas / horasObjetivo) * 100);
  const esMesPagaExtra = payrollData?.pagas_extras?.es_mes_paga && !payrollData?.pagas_extras?.prorrateadas;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  const d = payrollData?.desglose_bruto || {};
  const ded = payrollData?.deducciones_trabajador || {};
  const emp = payrollData?.costes_empresa || {};

  return (
    <div className="space-y-6" data-testid="payroll-page">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Calculator className="w-8 h-8" />
              Calculadora de Nómina
            </h1>
            <p className="text-muted-foreground">Convenio Seguridad Privada 2026</p>
          </div>
          
          {/* Company Selector */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setSelectedCompany(1)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCompany === 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              data-testid="payroll-company-1-btn"
            >
              {companyNames[1]}
            </button>
            <button
              onClick={() => setSelectedCompany(2)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCompany === 2 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              data-testid="payroll-company-2-btn"
            >
              {companyNames[2]}
            </button>
          </div>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-end gap-2">
          <button onClick={handlePrevMonth} className="month-nav-btn" data-testid="payroll-prev-month">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center" data-testid="payroll-current-month">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={handleNextMonth} className="month-nav-btn" data-testid="payroll-next-month">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Paga Extra Alert */}
      {esMesPagaExtra && (
        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-4 flex items-center gap-3">
            <Gift className="w-6 h-6 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-800 dark:text-orange-200">¡Mes de Paga Extra!</p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Este mes incluye paga extra íntegra de {payrollData?.pagas_extras?.importe_paga?.toFixed(2)} €
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Card */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-semibold">Cumplimiento de Jornada</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums">{horasComputadas.toFixed(1)}h</span>
              <span className="text-muted-foreground"> / {horasObjetivo.toFixed(1)}h objetivo</span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {payrollData?.categoria} • Contrato {payrollData?.tipo_contrato} • Jornada {payrollData?.porcentaje_jornada}%
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card data-testid="payroll-bruto-card">
          <CardContent className="pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Bruto</p>
            <p className="text-xl font-bold tabular-nums">{payrollData?.total_bruto?.toFixed(2) || '0.00'} €</p>
          </CardContent>
        </Card>
        <Card data-testid="payroll-deducciones-card">
          <CardContent className="pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Deducciones</p>
            <p className="text-xl font-bold tabular-nums text-red-600">-{ded.total?.toFixed(2) || '0.00'} €</p>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground" data-testid="payroll-neto-card">
          <CardContent className="pt-4">
            <p className="text-xs uppercase tracking-wider opacity-80 mb-1">Neto a Percibir</p>
            <p className="text-2xl font-bold tabular-nums">{payrollData?.salario_neto?.toFixed(2) || '0.00'} €</p>
          </CardContent>
        </Card>
        <Card data-testid="payroll-empresa-card">
          <CardContent className="pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Coste Empresa
            </p>
            <p className="text-xl font-bold tabular-nums">{emp.coste_total?.toFixed(2) || '0.00'} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Details */}
      <Tabs defaultValue="trabajador" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trabajador" className="gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Trabajador</span>
          </TabsTrigger>
          <TabsTrigger value="deducciones" className="gap-2">
            <TrendingDown className="w-4 h-4" />
            <span className="hidden sm:inline">Deducciones</span>
          </TabsTrigger>
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
        </TabsList>

        {/* Trabajador Tab */}
        <TabsContent value="trabajador" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Devengos (Salario Bruto)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>Salario Base</TableCell>
                      <TableCell className="text-right tabular-nums">{d.salario_base?.toFixed(2)} €</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Plus Peligrosidad</TableCell>
                      <TableCell className="text-right tabular-nums">{d.plus_peligrosidad?.toFixed(2)} €</TableCell>
                    </TableRow>
                    {d.plus_actividad > 0 && (
                      <TableRow>
                        <TableCell>Plus Actividad</TableCell>
                        <TableCell className="text-right tabular-nums">{d.plus_actividad?.toFixed(2)} €</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell>Plus Transporte</TableCell>
                      <TableCell className="text-right tabular-nums">{d.plus_transporte?.toFixed(2)} €</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Plus Vestuario</TableCell>
                      <TableCell className="text-right tabular-nums">{d.plus_vestuario?.toFixed(2)} €</TableCell>
                    </TableRow>
                    {d.plus_antiguedad > 0 && (
                      <TableRow>
                        <TableCell>Plus Antigüedad</TableCell>
                        <TableCell className="text-right tabular-nums">{d.plus_antiguedad?.toFixed(2)} €</TableCell>
                      </TableRow>
                    )}
                    {d.plus_responsable_equipo > 0 && (
                      <TableRow>
                        <TableCell>Plus Responsable Equipo</TableCell>
                        <TableCell className="text-right tabular-nums">{d.plus_responsable_equipo?.toFixed(2)} €</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="border-t-2">
                      <TableCell className="flex items-center gap-1">
                        <Moon className="w-4 h-4" /> Nocturnidad
                        <span className="text-xs text-muted-foreground">({payrollData?.horas?.nocturnas?.toFixed(1)}h)</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.plus_nocturnidad?.toFixed(2)} €</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> Festivo
                        <span className="text-xs text-muted-foreground">({payrollData?.horas?.festivas?.toFixed(1)}h)</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.plus_festivo?.toFixed(2)} €</TableCell>
                    </TableRow>
                    {d.plus_servicio_importe > 0 && (
                      <TableRow className="bg-green-50 dark:bg-green-950/30">
                        <TableCell className="font-medium">
                          {d.plus_servicio_nombre || "Plus Servicio"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{d.plus_servicio_importe?.toFixed(2)} €</TableCell>
                      </TableRow>
                    )}
                    {d.paga_extra > 0 && (
                      <TableRow className="bg-orange-50 dark:bg-orange-950/30">
                        <TableCell className="flex items-center gap-1">
                          <Gift className="w-4 h-4 text-orange-600" /> 
                          <strong>Paga Extra</strong>
                          <span className="text-xs text-muted-foreground">
                            ({payrollData?.pagas_extras?.prorrateadas ? 'prorrateada' : 'íntegra'})
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{d.paga_extra?.toFixed(2)} €</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>TOTAL BRUTO</TableCell>
                      <TableCell className="text-right tabular-nums text-lg">{payrollData?.total_bruto?.toFixed(2)} €</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Resumen de Horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card border-2 border-primary/30">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Trabajadas</p>
                    <p className="text-2xl font-bold tabular-nums text-primary">{payrollData?.horas?.trabajadas?.toFixed(1)}h</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Computadas</p>
                    <p className="text-2xl font-bold tabular-nums">{payrollData?.horas?.computadas?.toFixed(1)}h</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Moon className="w-3 h-3" /> Nocturnas
                    </p>
                    <p className="text-2xl font-bold tabular-nums">{payrollData?.horas?.nocturnas?.toFixed(1)}h</p>
                  </div>
                  <div className="stat-card">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Festivas
                    </p>
                    <p className="text-2xl font-bold tabular-nums">{payrollData?.horas?.festivas?.toFixed(1)}h</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Base de Cotización</p>
                  <p className="text-2xl font-bold tabular-nums">{payrollData?.base_cotizacion?.toFixed(2)} €</p>
                  <p className="text-xs text-muted-foreground">
                    Excluye plus transporte y vestuario (hasta límites exentos)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deducciones Tab */}
        <TabsContent value="deducciones">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Deducciones del Trabajador
              </CardTitle>
              <CardDescription>Retenciones de Seguridad Social e IRPF</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div>Contingencias Comunes</div>
                      <div className="text-xs text-muted-foreground">Enfermedad, maternidad, accidentes no laborales</div>
                    </TableCell>
                    <TableCell className="text-right">4,70%</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">-{ded.contingencias_comunes?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div>Desempleo</div>
                      <div className="text-xs text-muted-foreground">Contrato {payrollData?.tipo_contrato}</div>
                    </TableCell>
                    <TableCell className="text-right">{payrollData?.tipo_contrato === 'indefinido' ? '1,55%' : '1,60%'}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">-{ded.desempleo?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div>Formación Profesional</div>
                      <div className="text-xs text-muted-foreground">Formación continua</div>
                    </TableCell>
                    <TableCell className="text-right">0,10%</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">-{ded.formacion_profesional?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div>MEI (Mecanismo de Equidad Intergeneracional)</div>
                      <div className="text-xs text-muted-foreground">Sostenibilidad pensiones</div>
                    </TableCell>
                    <TableCell className="text-right">0,13%</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">-{ded.mei?.toFixed(2)} €</TableCell>
                  </TableRow>
                  {ded.horas_extras > 0 && (
                    <TableRow>
                      <TableCell>Horas Extraordinarias</TableCell>
                      <TableCell className="text-right">4,70%</TableCell>
                      <TableCell className="text-right tabular-nums text-red-600">-{ded.horas_extras?.toFixed(2)} €</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={2}><strong>Total Seguridad Social</strong></TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 font-semibold">-{ded.total_ss?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell>
                      <div><strong>IRPF</strong></div>
                      <div className="text-xs text-muted-foreground">Retención personalizada</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{ded.irpf_porcentaje}%</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 font-semibold">-{ded.irpf?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow className="bg-red-50 dark:bg-red-950/30 font-bold">
                    <TableCell colSpan={2}>TOTAL DEDUCCIONES</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600 text-lg">-{ded.total?.toFixed(2)} €</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">LÍQUIDO A PERCIBIR</span>
                  <span className="text-3xl font-bold text-green-700 dark:text-green-400 tabular-nums">
                    {payrollData?.salario_neto?.toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Empresa Tab */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Costes de la Empresa
              </CardTitle>
              <CardDescription>Cotizaciones a cargo del empleador</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Tipo</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Contingencias Comunes</TableCell>
                    <TableCell className="text-right">23,60%</TableCell>
                    <TableCell className="text-right tabular-nums">{emp.contingencias_comunes?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Desempleo ({payrollData?.tipo_contrato})</TableCell>
                    <TableCell className="text-right">{payrollData?.tipo_contrato === 'indefinido' ? '5,50%' : '6,70%'}</TableCell>
                    <TableCell className="text-right tabular-nums">{emp.desempleo?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>FOGASA (Fondo Garantía Salarial)</TableCell>
                    <TableCell className="text-right">0,20%</TableCell>
                    <TableCell className="text-right tabular-nums">{emp.fogasa?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Formación Profesional</TableCell>
                    <TableCell className="text-right">0,60%</TableCell>
                    <TableCell className="text-right tabular-nums">{emp.formacion_profesional?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div>AT y EP</div>
                      <div className="text-xs text-muted-foreground">Accidentes trabajo y enfermedades profesionales</div>
                    </TableCell>
                    <TableCell className="text-right">~1,50%</TableCell>
                    <TableCell className="text-right tabular-nums">{emp.at_ep?.toFixed(2)} €</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>MEI (Mecanismo Equidad Intergeneracional)</TableCell>
                    <TableCell className="text-right">0,58%</TableCell>
                    <TableCell className="text-right tabular-nums">{emp.mei?.toFixed(2)} €</TableCell>
                  </TableRow>
                  {emp.horas_extras > 0 && (
                    <TableRow>
                      <TableCell>Horas Extraordinarias</TableCell>
                      <TableCell className="text-right">23,60%</TableCell>
                      <TableCell className="text-right tabular-nums">{emp.horas_extras?.toFixed(2)} €</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={2}><strong>Total Seguridad Social Empresa</strong></TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{emp.total_ss?.toFixed(2)} €</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Salario Bruto Trabajador</p>
                  <p className="text-xl font-bold tabular-nums">{payrollData?.total_bruto?.toFixed(2)} €</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">+ SS a cargo empresa</p>
                  <p className="text-xl font-bold tabular-nums">{emp.total_ss?.toFixed(2)} €</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">COSTE TOTAL EMPRESA</span>
                  <span className="text-3xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                    {emp.coste_total?.toFixed(2)} €
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={handleExportPDF} className="gap-2" data-testid="export-pdf-btn">
          <Download className="w-4 h-4" />
          Exportar Nómina PDF
        </Button>
      </div>

      {/* Info Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Cálculos según el Convenio Colectivo de Seguridad Privada 2026.
            Las <strong>pagas extras</strong> (marzo, julio, diciembre) incluyen salario base + antigüedad + peligrosidad.
            El <strong>MEI 2026</strong> es del 0,13% trabajador y 0,58% empresa.
            Valores orientativos - consulta tu nómina oficial para datos exactos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
