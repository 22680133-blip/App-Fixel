import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { IonContent, ViewWillEnter } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class DashboardPage implements OnInit, OnDestroy, AfterViewInit, ViewWillEnter {
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
  energia = 'Normal';
  compresor = 'Apagado';
  ultimaActualizacion = '--:--';

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

  // Lecturas del endpoint /api/readings
  readings: Reading[] = [];
  readingsError = '';

  // Estado de carga y error
  isLoading = true;
  errorMsg = '';
  sinDatos = false;

  // Chart.js
  private chart: Chart | null = null;

  // Polling
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_SECONDS = 5;

  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly readingsService = inject(ReadingsService);
  private readonly router = inject(Router);

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
    this.cargarDatos();
    this.cargarReadings();
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
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
          this.sinDatos = false;
          this.deviceStatus = 'desconectado';
          return;
        }
        const lectura: Lectura = res.reading;
        // Normalize timestamp field (deployed backend may use created_at)
        const readingTimestamp = lectura.timestamp || (lectura as any).created_at;
        this.temperaturaNum = lectura.temperatura;
        this.temperatura = lectura.temperatura.toFixed(1);
        this.energia = lectura.energia || 'Normal';

        // Compressor logic: ON if temp > max, OFF if within range
        if (this.temperaturaNum > this.maxTemp) {
          this.compresor = 'Encendido';
        } else {
          this.compresor = 'Apagado';
        }

        const fecha = readingTimestamp ? new Date(readingTimestamp) : new Date();
        this.ultimaActualizacion = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;

        // Connection status based on timestamp (connected if last reading < 60 seconds ago)
        const secondsAgo = (Date.now() - fecha.getTime()) / 1000;
        if ((lectura.energia || 'Normal') === 'Falla') {
          this.deviceStatus = 'alerta';
        } else if (secondsAgo <= 60) {
          this.deviceStatus = 'activo';
        } else {
          this.deviceStatus = 'desconectado';
        }

        // Evaluar si la temperatura está fuera de rango
        this.evaluarAlerta();
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private cargarHistorial(deviceId: number) {
    this.deviceService.getHistorial(deviceId).subscribe({
      next: (res) => {
        if (res.readings && res.readings.length > 0) {
          // Calculate recorded min/max from history (ESP32 logic)
          const temps = res.readings.map((r) => r.temperatura).filter((t) => t != null);
          if (temps.length > 0) {
            this.tempMinRegistrada = temps.reduce((min, t) => Math.min(min, t), temps[0]);
            this.tempMaxRegistrada = temps.reduce((max, t) => Math.max(max, t), temps[0]);
          }

          this.renderChart(res.readings);
        }
      },
    });
  }

  private renderChart(readings: Lectura[]) {
    if (!this.chartCanvas) return;

    const labels = readings.map((r) => {
      const ts = r.timestamp || (r as any).created_at;
      const d = ts ? new Date(ts) : new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

    const temps = readings.map((r) =>
      this.unit === 'F' ? this.toFahrenheit(r.temperatura) : r.temperatura
    );

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = temps;
      this.chart.data.datasets[0].label = `Temperatura (${this.unitSymbol})`;
      this.chart.update();
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

  private startPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      if (this.dispositivo) {
        this.cargarUltimaLectura(this.dispositivo.id);
        this.cargarHistorial(this.dispositivo.id);
      }
      this.cargarReadings();
    }, this.POLL_SECONDS * 1000);
  }

  /** Cargar lecturas desde el endpoint /api/readings */
  private cargarReadings() {
    this.readingsService.getReadings().subscribe({
      next: (data) => {
        console.log('Datos recibidos:', data);
        this.readings = data;
        this.readingsError = '';
      },
      error: (err) => {
        console.error('Error al obtener lecturas:', err);
        this.readingsError = 'No se pudieron cargar las lecturas del sensor.';
      },
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

  /** Returns the timestamp from a reading, falling back to created_at if timestamp is absent */
  getReadingTimestamp(r: Reading): string | null {
    return r.timestamp || r.created_at || null;
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
