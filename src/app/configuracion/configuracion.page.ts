import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DeviceService, Dispositivo } from '../services/device.service';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss'],
  standalone: true,
  imports: [IonContent, FormsModule, CommonModule],
})
export class ConfiguracionPage implements OnInit, OnDestroy {
  deviceName = 'Refrigerador Cocina';
  minTemp = 2;
  maxTemp = 8;
  alerts = true;
  unit = 'C';

  isLoading = false;
  guardado = false;
  errorMsg = '';

  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private dispositivoId: string | null = null;
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  ngOnInit() {
    this.cargarConfiguracion();
  }

  private cargarConfiguracion() {
    // Intentar usar el dispositivo activo guardado
    const active = this.deviceService.getActiveDevice();

    if (active) {
      this.dispositivoId = active.id;
      this.deviceName = active.nombre;
      this.minTemp = active.tempMin;
      this.maxTemp = active.tempMax;
      this.unit = active.unidad;
      this.alerts = active.alertas;
      return;
    }

    // Si no hay dispositivo activo, cargar el primero de la lista
    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        if (res.devices && res.devices.length > 0) {
          const d: Dispositivo = res.devices[0];
          this.dispositivoId = d.id;
          this.deviceName = d.nombre;
          this.minTemp = d.tempMin;
          this.maxTemp = d.tempMax;
          this.unit = d.unidad;
          this.alerts = d.alertas;

          // Guardar como dispositivo activo
          this.deviceService.setActiveDevice(d);
        }
      },
    });
  }

  guardar() {
    if (!this.dispositivoId) {
      this.errorMsg = 'No hay dispositivo registrado. Agrega uno primero.';
      return;
    }

    this.isLoading = true;
    this.guardado = false;
    this.errorMsg = '';

    this.deviceService
      .guardarConfiguracion(this.dispositivoId, {
        nombre: this.deviceName,
        tempMin: this.minTemp,
        tempMax: this.maxTemp,
        unidad: this.unit,
        alertas: this.alerts,
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.guardado = true;
          this.successTimer = setTimeout(() => (this.guardado = false), 3000);
        },
        error: () => {
          this.isLoading = false;
          this.errorMsg = 'Error al guardar. Intenta de nuevo.';
        },
      });
  }

  ngOnDestroy() {
    if (this.successTimer) clearTimeout(this.successTimer);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

