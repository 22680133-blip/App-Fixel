import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { IonContent, ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DeviceService, Dispositivo, Lectura } from '../services/device.service';
import { Reading } from '../services/readings.service';
import { SensorService, SensorData } from '../services/sensor.service';
import { AssistantService } from '../services/assistant.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit, ViewWillEnter, ViewWillLeave {
  /** Seconds within which a reading is considered fresh (device "activo") */
  private static readonly CONNECTION_TIMEOUT_SECONDS = 60;
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  // Datos del usuario
  nombreUsuario = 'Usuario';

  // Datos del dispositivo activo
  dispositivo: Dispositivo | null = null;
  deviceNombre = 'Refrigerador';
  deviceStatus = 'desconectado';
  deviceId = '';
  minTemp = 2;
  maxTemp = 8;

  // Datos de temperatura (del sensor ESP32 vía MQTT)
  temperatura = '--';
  temperaturaNum: number | null = null;
  humedadActual: number | null = null;
  energia = 'Normal';
  compresor = 'Apagado';
  ultimaActualizacion = '---';

  // Unidad de temperatura (°C / °F)
  unit: 'C' | 'F' = 'C';

  // Estado de temperatura (lógica ESP32: NORMAL, ALTA, BAJA)
  estado: 'NORMAL' | 'ALTA' | 'BAJA' = 'NORMAL';

  // Temperaturas mínima y máxima registradas (calculadas del historial)
  tempMinRegistrada: number | null = null;
  tempMaxRegistrada: number | null = null;

  // Alerta de temperatura fuera de rango
  fueraDeRango = false;
  alertaTempMsg = '';

  // User preference: alerts enabled/disabled (synced from configuration page)
  alertsEnabled = true;

  // Estado de carga y error
  isLoading = true;
  errorMsg = '';
  sinDatos = false;

  // Chart.js
  private chart: Chart | null = null;

  // Pending chart data (stored when canvas is unavailable due to *ngIf hiding it;
  // cleared after successful render in renderChart/renderChartFromReadings, or on data reload)
  private pendingChartReadings: Lectura[] | null = null;
  private pendingChartFromReadings: Reading[] | null = null;

  // RxJS subscriptions for centralized sensor polling
  private sensorSub: Subscription | null = null;
  private readingsSub: Subscription | null = null;

  // Stored readings for re-rendering chart on unit toggle
  private lastChartLecturas: Lectura[] | null = null;
  private lastChartReadings: Reading[] | null = null;

  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly sensorService = inject(SensorService);
  private readonly assistantService = inject(AssistantService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Chat del asistente IA
  chatMessages: { role: 'user' | 'assistant'; text: string }[] = [];
  chatInput = '';
  chatLoading = false;

  ngOnInit() {
    const usuario = this.auth.getUsuario();
    if (usuario) {
      this.nombreUsuario = usuario.nombre || usuario.email;
    }
    // Load saved unit preference
    const savedUnit = localStorage.getItem('tempUnit');
    if (savedUnit === 'F' || savedUnit === 'C') {
      this.unit = savedUnit;
    }
  }

  ngAfterViewInit() {
    // Chart will be initialized after data is loaded
  }

  /** Ionic lifecycle: fires every time the page becomes active (e.g. coming back from profile) */
  ionViewWillEnter() {
    // Reload user name (may have changed in profile)
    const usuario = this.auth.getUsuario();
    if (usuario) {
      this.nombreUsuario = usuario.nombre || usuario.email;
    }
    // Reload unit preference and data whenever the user navigates back
    const savedUnit = localStorage.getItem('tempUnit');
    if (savedUnit === 'F' || savedUnit === 'C') {
      this.unit = savedUnit;
    }
    // Reload alerts preference (default to enabled if not set)
    const savedAlerts = localStorage.getItem('alertsEnabled');
    this.alertsEnabled = savedAlerts === null || savedAlerts !== 'false';

    this.cargarDatos();
  }

  /** Ionic lifecycle: fires when leaving the page — stop polling */
  ionViewWillLeave() {
    this.stopPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    if (this.chart) this.chart.destroy();
  }

  toggleUnit() {
    this.unit = this.unit === 'C' ? 'F' : 'C';
    localStorage.setItem('tempUnit', this.unit);
    // Re-render chart in the new unit
    if (this.lastChartReadings) {
      this.renderChartFromReadings(this.lastChartReadings);
    } else if (this.lastChartLecturas) {
      this.renderChart(this.lastChartLecturas);
    }
  }

  /** Convierte Celsius a Fahrenheit */
  toFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  }

  /** Devuelve la temperatura formateada en la unidad actual */
  getDisplayTemp(celsius: number | null): string {
    if (celsius === null) return '--';
    const value = this.unit === 'F' ? this.toFahrenheit(celsius) : celsius;
    return value.toFixed(1);
  }

  /** Devuelve el símbolo de unidad actual */
  get unitSymbol(): string {
    return this.unit === 'F' ? '°F' : '°C';
  }

  private cargarDatos() {
    this.isLoading = true;
    this.errorMsg = '';
    this.sinDatos = false;

    // Destroy stale chart (canvas is about to be removed by *ngIf)
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    this.pendingChartReadings = null;
    this.pendingChartFromReadings = null;

    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        if (!res.devices || res.devices.length === 0) {
          this.isLoading = false;
          this.sinDatos = true;
          return;
        }

        // Usar dispositivo activo guardado, o el primero de la lista
        const active = this.deviceService.getActiveDevice();
        const match = active
          ? res.devices.find((d) => d.id === active.id)
          : null;
        this.dispositivo = match || res.devices[0];

        // Actualizar el dispositivo activo en el servicio
        this.deviceService.setActiveDevice(this.dispositivo);

        this.deviceNombre = this.dispositivo.nombre;
        this.deviceId = this.dispositivo.deviceId || '';
        this.minTemp = this.dispositivo.limiteMin;
        this.maxTemp = this.dispositivo.limiteMax;

        // Cargar lectura y historial
        this.cargarUltimaLectura(this.dispositivo.id);
        this.cargarHistorial(this.dispositivo.id);

        // Start real-time polling now that deviceId is available
        this.startPolling();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.auth.logout();
          return;
        }
        this.errorMsg = err.status === 0
          ? 'No se puede conectar al servidor. Verifica tu conexión a internet.'
          : 'Error al cargar datos del dispositivo.';
        console.error('[Dashboard] Error al cargar dispositivos:', err);
      },
    });
  }

  private cargarUltimaLectura(deviceId: number) {
    this.deviceService.getUltimaLectura(deviceId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.reading) {
          this.applyLectura(res.reading);
        } else {
          this.cdr.detectChanges();
          this.flushPendingChart();
        }
      },
      error: (err) => {
        console.error('[Dashboard] Error al cargar última lectura:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.flushPendingChart();
      },
    });
  }

  /** Applies a Lectura (from device-specific endpoint) to the dashboard state */
  private applyLectura(lectura: Lectura) {
    const readingTimestamp = lectura.timestamp || (lectura as any).created_at;
    this.temperaturaNum = lectura.temperatura;
    this.temperatura = lectura.temperatura.toFixed(1);
    this.humedadActual = lectura.humedad ?? null;
    this.energia = lectura.energia || 'Normal';

    // Compressor logic: ON if temp > max, OFF if within range
    if (this.temperaturaNum > this.maxTemp) {
      this.compresor = 'Encendido';
    } else {
      this.compresor = 'Apagado';
    }

    this.ultimaActualizacion = this.formatTimestamp(readingTimestamp);

    // Connection status based on timestamp (60-second threshold)
    const secondsAgo = this.getSecondsAgo(readingTimestamp);
    if ((lectura.energia || 'Normal') === 'Falla') {
      this.deviceStatus = 'alerta';
    } else if (secondsAgo <= DashboardPage.CONNECTION_TIMEOUT_SECONDS) {
      this.deviceStatus = 'activo';
    } else {
      this.deviceStatus = 'desconectado';
    }

    this.evaluarAlerta();
    this.cdr.detectChanges();
    this.flushPendingChart();
  }

  /** Applies centralized SensorData (from SensorService) to the dashboard state */
  private applySensorData(data: SensorData) {
    this.temperaturaNum = data.temperatura;
    this.temperatura = data.temperatura.toFixed(1);
    this.humedadActual = data.humedad;
    this.energia = 'Normal';

    // Compressor logic: ON if temp > max, OFF if within range
    if (this.temperaturaNum > this.maxTemp) {
      this.compresor = 'Encendido';
    } else {
      this.compresor = 'Apagado';
    }

    this.ultimaActualizacion = this.formatTimestamp(data.timestamp);

    // Connection status based on timestamp
    const secondsAgo = this.getSecondsAgo(data.timestamp);
    if (secondsAgo <= DashboardPage.CONNECTION_TIMEOUT_SECONDS) {
      this.deviceStatus = 'activo';
    } else {
      this.deviceStatus = 'desconectado';
    }

    this.evaluarAlerta();
    this.cdr.detectChanges();
    this.flushPendingChart();
  }

  /** Formats a timestamp string into a readable date/time */
  private formatTimestamp(ts: string | undefined | null): string {
    if (!ts) return '---';
    const fecha = new Date(ts);
    if (isNaN(fecha.getTime())) return '---';
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    const ss = String(fecha.getSeconds()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}:${ss}`;
  }

  /** Returns seconds elapsed since the given timestamp, or Infinity if invalid */
  private getSecondsAgo(ts: string | undefined | null): number {
    if (!ts) return Infinity;
    const fecha = new Date(ts);
    if (isNaN(fecha.getTime())) return Infinity;
    return (Date.now() - fecha.getTime()) / 1000;
  }

  private cargarHistorial(deviceId: number) {
    this.deviceService.getHistorial(deviceId).subscribe({
      next: (res) => {
        if (res.readings && res.readings.length > 0) {
          this.updateMinMaxFromTemps(res.readings.map((r) => r.temperatura));
          this.renderChart(res.readings);
        }
      },
      error: (err) => {
        console.error('[Dashboard] Error al cargar historial:', err);
        // SensorService will provide chart data as fallback
      },
    });
  }

  /** Updates min/max temperatures from an array of temperature values */
  private updateMinMaxFromTemps(temps: number[]) {
    const valid = temps.filter((t) => t != null);
    if (valid.length > 0) {
      this.tempMinRegistrada = valid.reduce((min, t) => Math.min(min, t), valid[0]);
      this.tempMaxRegistrada = valid.reduce((max, t) => Math.max(max, t), valid[0]);
    }
  }

  private renderChart(readings: Lectura[]) {
    this.lastChartLecturas = readings;
    this.lastChartReadings = null;
    if (!this.chartCanvas?.nativeElement) {
      this.pendingChartReadings = readings;
      return;
    }
    this.pendingChartReadings = null;

    const labels = readings.map((r) => {
      const ts = r.timestamp || (r as any).created_at;
      const d = ts ? new Date(ts) : new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const temps = readings.map((r) =>
      this.unit === 'F' ? this.toFahrenheit(r.temperatura) : r.temperatura
    );

    this.updateChart(labels, temps);
  }

  /** Renders chart from Reading[] (fallback from /api/readings) */
  private renderChartFromReadings(readings: Reading[]) {
    this.lastChartReadings = readings;
    this.lastChartLecturas = null;
    if (!this.chartCanvas?.nativeElement) {
      this.pendingChartFromReadings = readings;
      return;
    }
    this.pendingChartFromReadings = null;

    const labels = readings.map((r) => {
      const ts = r.timestamp || r.created_at || r.fecha;
      const d = ts ? new Date(ts) : new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const temps = readings.map((r) =>
      this.unit === 'F' ? this.toFahrenheit(r.temperatura) : r.temperatura
    );

    this.updateChart(labels, temps);
  }

  /** Creates or updates the Chart.js instance */
  private updateChart(labels: string[], temps: number[]) {
    if (!this.chartCanvas?.nativeElement) return;
    if (labels.length === 0 || temps.length === 0) return;

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = temps;
      this.chart.data.datasets[0].label = `Temperatura (${this.unitSymbol})`;
      this.chart.update('none'); // Skip animation for real-time updates
      return;
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Temperatura (${this.unitSymbol})`,
            data: temps,
            borderColor: '#00e5ff',
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            pointBackgroundColor: '#00e5ff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(255,255,255,0.6)', maxTicksLimit: 8 },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: { color: 'rgba(255,255,255,0.6)' },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    });
  }

  /** Renders any pending chart data that was deferred because the canvas was not yet in the DOM */
  private flushPendingChart() {
    if (this.pendingChartReadings) {
      this.renderChart(this.pendingChartReadings);
    } else if (this.pendingChartFromReadings) {
      this.renderChartFromReadings(this.pendingChartFromReadings);
    }
  }

  /** Stop all polling subscriptions */
  private stopPolling() {
    this.sensorService.stopPolling();
    if (this.sensorSub) {
      this.sensorSub.unsubscribe();
      this.sensorSub = null;
    }
    if (this.readingsSub) {
      this.readingsSub.unsubscribe();
      this.readingsSub = null;
    }
  }

  private startPolling() {
    this.stopPolling();

    // Start centralized sensor polling
    this.sensorService.startPolling(this.deviceId);

    // Subscribe to latest sensor data for ALL dashboard elements
    this.sensorSub = this.sensorService.latestData$.subscribe(data => {
      if (!data) return;
      this.isLoading = false;
      this.applySensorData(data);
    });

    // Subscribe to all readings for chart + min/max
    this.readingsSub = this.sensorService.readings$.subscribe(readings => {
      if (readings.length === 0) return;
      this.updateMinMaxFromTemps(readings.map(r => r.temperatura));
      this.renderChartFromReadings(readings);
    });
  }

  private evaluarAlerta() {
    if (this.temperaturaNum === null) {
      this.fueraDeRango = false;
      this.estado = 'NORMAL';
      return;
    }
    if (this.temperaturaNum < this.minTemp) {
      this.fueraDeRango = true;
      this.estado = 'BAJA';
      this.alertaTempMsg = `La temperatura (${this.getDisplayTemp(this.temperaturaNum)}${this.unitSymbol}) está por debajo del mínimo configurado (${this.getDisplayTemp(this.minTemp)}${this.unitSymbol}).`;
    } else if (this.temperaturaNum > this.maxTemp) {
      this.fueraDeRango = true;
      this.estado = 'ALTA';
      this.alertaTempMsg = `La temperatura (${this.getDisplayTemp(this.temperaturaNum)}${this.unitSymbol}) está por encima del máximo configurado (${this.getDisplayTemp(this.maxTemp)}${this.unitSymbol}).`;
    } else {
      this.fueraDeRango = false;
      this.estado = 'NORMAL';
      this.alertaTempMsg = '';
    }
  }

  sendChat() {
    const pregunta = this.chatInput.trim();
    if (!pregunta || this.chatLoading) return;

    this.chatMessages.push({ role: 'user', text: pregunta });
    this.chatInput = '';
    this.chatLoading = true;

    this.assistantService.ask(pregunta).subscribe({
      next: (res) => {
        this.chatMessages.push({ role: 'assistant', text: res.respuesta });
        this.chatLoading = false;
      },
      error: (err) => {
        console.error('[Dashboard] Error en asistente IA:', err);
        const msg = err.status === 0
          ? 'No se puede conectar al servidor. Verifica tu conexión.'
          : 'No se pudo obtener respuesta del asistente. Por favor, inténtalo de nuevo.';
        this.chatMessages.push({ role: 'assistant', text: msg });
        this.chatLoading = false;
      },
    });
  }

  logout() {
    this.auth.logout();
  }

  goToPerfil() {
    this.router.navigate(['/perfil']);
  }

  goToConfiguracion() {
    this.router.navigate(['/configuracion']);
  }
}
