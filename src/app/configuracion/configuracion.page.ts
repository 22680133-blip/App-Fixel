import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
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
  unit: 'C' | 'F' = 'C';

  isLoading = false;
  guardado = false;
  errorMsg = '';
  validationError = '';

  // Password change
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = false;
  passwordMsg = '';
  passwordError = '';
  showCurrentPassword = false;
  showNewPassword = false;

  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private dispositivoId: number | null = null;
  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  ngOnInit() {
    // Load saved unit preference
    const savedUnit = localStorage.getItem('tempUnit');
    if (savedUnit === 'F' || savedUnit === 'C') {
      this.unit = savedUnit;
    }
    this.cargarConfiguracion();
  }

  private cargarConfiguracion() {
    // Intentar usar el dispositivo activo guardado
    const active = this.deviceService.getActiveDevice();

    if (active) {
      this.dispositivoId = active.id;
      this.deviceName = active.nombre;
      this.minTemp = active.limiteMin;
      this.maxTemp = active.limiteMax;
      return;
    }

    // Si no hay dispositivo activo, cargar el primero de la lista
    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        if (res.devices && res.devices.length > 0) {
          const d: Dispositivo = res.devices[0];
          this.dispositivoId = d.id;
          this.deviceName = d.nombre;
          this.minTemp = d.limiteMin;
          this.maxTemp = d.limiteMax;

          // Guardar como dispositivo activo
          this.deviceService.setActiveDevice(d);
        }
      },
    });
  }

  setUnit(u: 'C' | 'F') {
    this.unit = u;
    localStorage.setItem('tempUnit', u);
  }

  guardar() {
    if (!this.dispositivoId) {
      this.errorMsg = 'No hay dispositivo registrado. Agrega uno primero.';
      return;
    }

    // Validate temperature range
    this.validationError = '';
    if (this.minTemp >= this.maxTemp) {
      this.validationError = 'La temperatura mínima debe ser menor que la máxima.';
      return;
    }
    if (this.minTemp < -10 || this.maxTemp > 15) {
      this.validationError = 'Los valores deben estar entre -10°C y 15°C.';
      return;
    }

    this.isLoading = true;
    this.guardado = false;
    this.errorMsg = '';

    this.deviceService
      .guardarConfiguracion(this.dispositivoId, {
        nombre: this.deviceName,
        limiteMin: this.minTemp,
        limiteMax: this.maxTemp,
      })
      .subscribe({
        next: (res) => {
          this.isLoading = false;
          this.guardado = true;
          // Update active device with saved configuration
          if (res.device) {
            this.deviceService.setActiveDevice(res.device);
          }
          this.successTimer = setTimeout(() => (this.guardado = false), 3000);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMsg = err.status === 0
            ? 'No se puede conectar al servidor.'
            : 'Error al guardar. Intenta de nuevo.';
        },
      });
  }

  // ============================================================
  // Cambio de contraseña
  // ============================================================
  cambiarPassword() {
    this.passwordError = '';
    this.passwordMsg = '';

    if (!this.currentPassword) {
      this.passwordError = 'Ingresa tu contraseña actual.';
      return;
    }
    if (!this.newPassword) {
      this.passwordError = 'Ingresa la nueva contraseña.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.passwordError = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Las contraseñas no coinciden.';
      return;
    }

    this.changingPassword = true;

    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (res) => {
        this.changingPassword = false;
        this.passwordMsg = res.mensaje || 'Contraseña actualizada correctamente.';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => (this.passwordMsg = ''), 3000);
      },
      error: (err) => {
        this.changingPassword = false;
        this.passwordError = err.error?.mensaje || 'Error al cambiar contraseña.';
      },
    });
  }

  logout() {
    this.auth.logout();
  }

  ngOnDestroy() {
    if (this.successTimer) clearTimeout(this.successTimer);
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}

