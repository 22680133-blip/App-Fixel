import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { AuthService, Usuario } from '../services/auth.service';
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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly MAX_PHOTO_SIZE_MB = 5;

  usuario: Usuario | null = this.auth.getUsuario();
  dispositivos: Dispositivo[] = [];
  totalDispositivos = 0;
  activos = 0;

  // Editable profile fields
  editMode = false;
  editNombre = '';
  editTelefono = '';
  editUbicacion = '';
  savingProfile = false;
  profileMsg = '';
  profileError = '';
  uploadingPhoto = false;

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
      this.editNombre = this.usuario.nombre || '';
      this.editTelefono = this.usuario.telefono || '';
      this.editUbicacion = this.usuario.ubicacion || '';
      this.cargarDispositivos();
      this.cargarPerfilFresco();
    }
  }

  /** Carga datos frescos del usuario desde el backend (para obtener telefono/ubicacion reales) */
  private cargarPerfilFresco() {
    this.auth.getMe().subscribe({
      next: (res) => {
        this.usuario = res.usuario;
        this.editNombre = this.usuario.nombre || '';
        this.editTelefono = this.usuario.telefono || '';
        this.editUbicacion = this.usuario.ubicacion || '';
      },
      error: () => {
        // Si falla, mantener los datos locales
      },
    });
  }

  cargarDispositivos() {
    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        this.dispositivos = res.devices || [];
        this.totalDispositivos = this.dispositivos.length;
        this.activos = this.dispositivos.filter((d) => d.status === 'activo').length;
      },
      error: () => {
        this.dispositivos = [];
        this.totalDispositivos = 0;
        this.activos = 0;
      },
    });
  }

  // ============================================================
  // Editar perfil
  // ============================================================
  toggleEditMode() {
    this.editMode = !this.editMode;
    this.profileMsg = '';
    this.profileError = '';
    if (this.editMode && this.usuario) {
      this.editNombre = this.usuario.nombre || '';
      this.editTelefono = this.usuario.telefono || '';
      this.editUbicacion = this.usuario.ubicacion || '';
    }
  }

  guardarPerfil() {
    if (!this.editNombre.trim()) {
      this.profileError = 'El nombre es obligatorio.';
      return;
    }

    this.savingProfile = true;
    this.profileError = '';
    this.profileMsg = '';

    this.auth.updateProfile({
      nombre: this.editNombre.trim(),
      telefono: this.editTelefono.trim(),
      ubicacion: this.editUbicacion.trim(),
    }).subscribe({
      next: (res) => {
        this.savingProfile = false;
        this.usuario = res.usuario;
        this.editMode = false;
        this.profileMsg = 'Perfil actualizado correctamente.';
        setTimeout(() => (this.profileMsg = ''), 3000);
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileError =
          err.error?.mensaje || err.error?.error || err.error?.message ||
          'Error al actualizar perfil. Verifica tu conexión.';
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
        error: (err) => {
          this.creandoDispositivo = false;
          if (err.status === 0) {
            this.errorCrear = 'No se puede conectar al servidor. Verifica tu conexión.';
          } else if (err.status === 404) {
            this.errorCrear = 'Esta función no está disponible en el servidor actualmente.';
          } else if (err.status === 401) {
            this.errorCrear = 'Sesión expirada. Cierra sesión e inicia de nuevo.';
          } else {
            const serverMsg =
              err.error?.mensaje || err.error?.error || err.error?.message;
            this.errorCrear =
              serverMsg || 'Error al crear el dispositivo. Intenta de nuevo.';
          }
        },
      });
  }

  cerrarDeviceIdModal() {
    this.mostrarDeviceIdModal = false;
  }

  // ============================================================
  // Avatar dinámico
  // ============================================================
  abrirSelectorFoto() {
    this.fileInput.nativeElement.click();
  }

  onFotoSeleccionada(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.profileError = 'Solo se permiten archivos de imagen.';
      return;
    }

    // Limit file size
    if (file.size > this.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      this.profileError = `La imagen no debe superar ${this.MAX_PHOTO_SIZE_MB} MB.`;
      return;
    }

    this.uploadingPhoto = true;
    this.profileError = '';

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.auth.updateProfile({ picture: base64 }).subscribe({
        next: (res) => {
          this.uploadingPhoto = false;
          this.usuario = res.usuario;
          this.profileMsg = 'Foto actualizada correctamente.';
          setTimeout(() => (this.profileMsg = ''), 3000);
        },
        error: (err) => {
          this.uploadingPhoto = false;
          this.profileError =
            err.error?.mensaje || err.error?.error || err.error?.message ||
            'Error al subir la foto.';
        },
      });
    };
    reader.readAsDataURL(file);

    // Reset file input so the same file can be selected again
    input.value = '';
  }

  eliminarFoto() {
    this.uploadingPhoto = true;
    this.profileError = '';

    this.auth.updateProfile({ picture: '' }).subscribe({
      next: (res) => {
        this.uploadingPhoto = false;
        this.usuario = res.usuario;
        this.profileMsg = 'Foto eliminada.';
        setTimeout(() => (this.profileMsg = ''), 3000);
      },
      error: (err) => {
        this.uploadingPhoto = false;
        this.profileError =
          err.error?.mensaje || err.error?.error || err.error?.message ||
          'Error al eliminar la foto.';
      },
    });
  }

  // ============================================================
  // Navegación
  // ============================================================
  irCambiarPassword() {
    this.router.navigate(['/configuracion']);
  }

  logout() {
    this.auth.logout();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
