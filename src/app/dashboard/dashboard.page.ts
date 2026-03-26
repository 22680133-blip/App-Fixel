import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { IonContent, ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DeviceService, Dispositivo, Lectura } from '../services/device.service';
import { ReadingsService, Reading } from '../services/readings.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule],
})
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit, ViewWillEnter, ViewWillLeave {
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

  // Tracks whether the device-specific endpoints returned data
  private deviceEndpointHadData = false;
  private deviceHistorialHadData = false;

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

  // RxJS subscriptions for polling
  private pollingSub: Subscription | null = null;
  private readingsSub: Subscription | null = null;
  private readonly POLL_SECONDS = 5;

  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly readingsService = inject(ReadingsService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

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
    this.startPolling();
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

    // Reset data flags for fresh load
    this.deviceEndpointHadData = false;
    this.deviceHistorialHadData = false;

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
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err.status === 0
          ? 'No se puede conectar al servidor.'
          : 'Error al cargar datos del dispositivo.';
      },
    });
  }

  private cargarUltimaLectura(deviceId: number) {
    this.deviceService.getUltimaLectura(deviceId).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!res.reading) {
          this.deviceEndpointHadData = false;
          this.cdr.detectChanges();
          this.flushPendingChart();
          return;
        }
        this.deviceEndpointHadData = true;
        this.applyLectura(res.reading);
      },
      error: () => {
        this.isLoading = false;
        this.deviceEndpointHadData = false;
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

    // Connection status based on timestamp
    const secondsAgo = this.getSecondsAgo(readingTimestamp);
    if ((lectura.energia || 'Normal') === 'Falla') {
      this.deviceStatus = 'alerta';
    } else if (secondsAgo <= 10) {
      this.deviceStatus = 'activo';
    } else {
      this.deviceStatus = 'desconectado';
    }

    this.evaluarAlerta();
    this.cdr.detectChanges();
    this.flushPendingChart();
  }

  /** Applies a Reading (from /api/readings fallback) to the dashboard state */
  private applyReading(reading: Reading) {
    const readingTimestamp = reading.timestamp || reading.created_at;
    this.temperaturaNum = reading.temperatura;
    this.temperatura = reading.temperatura.toFixed(1);
    this.humedadActual = reading.humedad ?? null;
    this.energia = 'Normal';

    // Compressor logic: ON if temp > max, OFF if within range
    if (this.temperaturaNum > this.maxTemp) {
      this.compresor = 'Encendido';
    } else {
      this.compresor = 'Apagado';
    }

    this.ultimaActualizacion = this.formatTimestamp(readingTimestamp);

    // Connection status based on timestamp
    const secondsAgo = this.getSecondsAgo(readingTimestamp);
    if (secondsAgo <= 10) {
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
          this.deviceHistorialHadData = true;
          this.updateMinMaxFromTemps(res.readings.map((r) => r.temperatura));
          this.renderChart(res.readings);
        } else {
          this.deviceHistorialHadData = false;
        }
      },
      error: () => {
        this.deviceHistorialHadData = false;
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
    if (!this.chartCanvas?.nativeElement) {
      this.pendingChartFromReadings = readings;
      return;
    }
    this.pendingChartFromReadings = null;

    const labels = readings.map((r) => {
      const ts = r.timestamp || r.created_at;
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
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
    if (this.readingsSub) {
      this.readingsSub.unsubscribe();
      this.readingsSub = null;
    }
  }

  private startPolling() {
    this.stopPolling();

    // Poll device-specific endpoints every POLL_SECONDS
    this.pollingSub = interval(this.POLL_SECONDS * 1000).subscribe(() => {
      if (this.dispositivo) {
        this.cargarUltimaLectura(this.dispositivo.id);
        this.cargarHistorial(this.dispositivo.id);
      }
    });

    // Poll /api/readings using the RxJS-based realtime observable (error-resilient)
    this.readingsSub = this.readingsService.getRealtimeData().subscribe((data) => {
      this.processReadings(data);
    });
  }

  /**
   * Process readings from the /api/readings endpoint.
   * When the device-specific endpoints returned no data, this serves as a
   * fallback to populate the main dashboard with real ESP32 data.
   */
  private processReadings(data: Reading[]) {
    if (!data || data.length === 0) return;

    // Filter readings for the active device (match by device_code / deviceId)
    const deviceReadings = this.deviceId
      ? data.filter((r) => r.device_code === this.deviceId)
      : data;

    // Use all received readings if no device match found
    const relevantReadings = deviceReadings.length > 0 ? deviceReadings : data;

    // Sort by timestamp ascending for chart rendering
    const sorted = [...relevantReadings].sort((a, b) => {
      const tsA = new Date(a.timestamp || a.created_at || 0).getTime();
      const tsB = new Date(b.timestamp || b.created_at || 0).getTime();
      return tsA - tsB;
    });

    // Fallback: populate main dashboard if device-specific endpoint had no data
    if (!this.deviceEndpointHadData && sorted.length > 0) {
      this.isLoading = false;
      const latest = sorted[sorted.length - 1];
      this.applyReading(latest);
    }

    // Fallback: populate min/max and chart if device history had no data
    if (!this.deviceHistorialHadData && sorted.length > 0) {
      this.updateMinMaxFromTemps(sorted.map((r) => r.temperatura));
      this.renderChartFromReadings(sorted);
    }
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
