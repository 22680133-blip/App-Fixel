import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { DeviceService, Dispositivo } from '../services/device.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    CommonModule,
    FormsModule,
  ],
})
export class PerfilPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  usuario = this.auth.getUsuario();
  dispositivos: Dispositivo[] = [];
  totalDispositivos = 0;
  activos = 0;

  // Modal "Agregar dispositivo"
  mostrarModal = false;
  nuevoNombre = '';
  nuevoUbicacion = '';
  creandoDispositivo = false;
  errorCrear = '';

  // Modal "Device ID creado"
  mostrarDeviceIdModal = false;
  deviceIdCreado = '';

  ngOnInit() {
    if (this.usuario) {
      this.cargarDispositivos();
    }
  }

  cargarDispositivos() {
    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        this.dispositivos = res.devices || [];
        this.totalDispositivos = this.dispositivos.length;
        this.activos = this.dispositivos.filter((d) => d.status === 'activo').length;
      },
    });
  }

  // ============================================================
  // Seleccionar dispositivo activo
  // ============================================================
  seleccionarDispositivo(device: Dispositivo) {
    this.deviceService.setActiveDevice(device);
  }

  esDispositivoActivo(device: Dispositivo): boolean {
    const active = this.deviceService.getActiveDevice();
    return active !== null && active.id === device.id;
  }

  configurarDispositivo(device: Dispositivo) {
    this.deviceService.setActiveDevice(device);
    this.router.navigate(['/configuracion']);
  }

  // ============================================================
  // Modal: Agregar dispositivo
  // ============================================================
  abrirModalAgregar() {
    this.nuevoNombre = '';
    this.nuevoUbicacion = '';
    this.errorCrear = '';
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  crearDispositivo() {
    if (!this.nuevoNombre.trim()) {
      this.errorCrear = 'El nombre es obligatorio.';
      return;
    }

    this.creandoDispositivo = true;
    this.errorCrear = '';

    this.deviceService
      .crearDispositivo({
        nombre: this.nuevoNombre.trim(),
        ubicacion: this.nuevoUbicacion.trim(),
      })
      .subscribe({
        next: (res) => {
          this.creandoDispositivo = false;
          this.mostrarModal = false;

          // Mostrar el deviceId generado
          this.deviceIdCreado = res.device.deviceId;
          this.mostrarDeviceIdModal = true;

          // Seleccionar como dispositivo activo
          this.deviceService.setActiveDevice(res.device);

          // Recargar lista
          this.cargarDispositivos();
        },
        error: () => {
          this.creandoDispositivo = false;
          this.errorCrear = 'Error al crear el dispositivo. Intenta de nuevo.';
        },
      });
  }

  cerrarDeviceIdModal() {
    this.mostrarDeviceIdModal = false;
  }

  logout() {
    this.auth.logout();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
