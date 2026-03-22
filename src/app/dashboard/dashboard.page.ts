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
  minTemp = 2;
  maxTemp = 8;

  // Datos de temperatura (del sensor ESP32 vía MQTT)
  temperatura = '--';
  energia = 'Normal';
  compresor = 'Funcionando';
  ultimaActualizacion = '--:--';

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

        // Usar el primer dispositivo como activo
        this.dispositivo = res.devices[0];
        this.deviceNombre = this.dispositivo.nombre;
        this.deviceStatus = this.dispositivo.status;
        this.minTemp = this.dispositivo.tempMin;
        this.maxTemp = this.dispositivo.tempMax;

        // Cargar la última lectura del sensor
        this.cargarUltimaLectura(this.dispositivo._id);
      },
    });
  }

  private cargarUltimaLectura(deviceId: string) {
    this.deviceService.getUltimaLectura(deviceId).subscribe({
      next: (res) => {
        if (!res.reading) return;
        const lectura: Lectura = res.reading;
        this.temperatura = lectura.temperatura.toFixed(1);
        this.energia = lectura.energia;
        this.compresor = lectura.compresor ? 'Funcionando' : 'Detenido';
        const fecha = new Date(lectura.timestamp);
        this.ultimaActualizacion = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
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

