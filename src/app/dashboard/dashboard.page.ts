import { Component, OnInit, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DeviceService, Dispositivo, Lectura } from '../services/device.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule],
})
export class DashboardPage implements OnInit {
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
  compresor = 'Funcionando';
  ultimaActualizacion = '--:--';

  // Alerta de temperatura fuera de rango
  fueraDeRango = false;
  alertaTempMsg = '';

  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  ngOnInit() {
    const usuario = this.auth.getUsuario();
    if (usuario) {
      this.nombreUsuario = usuario.nombre || usuario.email;
    }
    this.cargarDatos();
  }

  private cargarDatos() {
    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        if (!res.devices || res.devices.length === 0) return;

        // Usar dispositivo activo guardado, o el primero de la lista
        const active = this.deviceService.getActiveDevice();
        const match = active
          ? res.devices.find((d) => d.id === active.id)
          : null;
        this.dispositivo = match || res.devices[0];

        // Actualizar el dispositivo activo en el servicio
        this.deviceService.setActiveDevice(this.dispositivo);

        this.deviceNombre = this.dispositivo.nombre;
        this.deviceStatus = this.dispositivo.status;
        this.deviceId = this.dispositivo.deviceId || '';
        this.minTemp = this.dispositivo.tempMin;
        this.maxTemp = this.dispositivo.tempMax;

        // Cargar la última lectura del sensor
        this.cargarUltimaLectura(this.dispositivo.id);
      },
    });
  }

  private cargarUltimaLectura(deviceId: string) {
    this.deviceService.getUltimaLectura(deviceId).subscribe({
      next: (res) => {
        if (!res.reading) return;
        const lectura: Lectura = res.reading;
        this.temperaturaNum = lectura.temperatura;
        this.temperatura = lectura.temperatura.toFixed(1);
        this.energia = lectura.energia;
        this.compresor = lectura.compresor ? 'Funcionando' : 'Detenido';
        const fecha = new Date(lectura.timestamp);
        this.ultimaActualizacion = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;

        // Evaluar si la temperatura está fuera de rango
        this.evaluarAlerta();
      },
    });
  }

  private evaluarAlerta() {
    if (this.temperaturaNum === null) {
      this.fueraDeRango = false;
      return;
    }
    if (this.temperaturaNum < this.minTemp) {
      this.fueraDeRango = true;
      this.alertaTempMsg = `La temperatura (${this.temperatura}°C) está por debajo del mínimo configurado (${this.minTemp}°C).`;
    } else if (this.temperaturaNum > this.maxTemp) {
      this.fueraDeRango = true;
      this.alertaTempMsg = `La temperatura (${this.temperatura}°C) está por encima del máximo configurado (${this.maxTemp}°C).`;
    } else {
      this.fueraDeRango = false;
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
