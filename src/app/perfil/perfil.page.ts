import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, ViewWillEnter, ViewWillLeave } from '@ionic/angular/standalone';
import { Subscription, interval, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
export class PerfilPage implements OnInit, OnDestroy, ViewWillEnter, ViewWillLeave {
  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private readonly MAX_PHOTO_SIZE_MB = 5;
  private readonly COMPRESSED_MAX_WIDTH = 512;
  private readonly COMPRESSED_QUALITY = 0.7;

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

  // Modal "Confirmar eliminación"
  mostrarDeleteModal = false;
  dispositivoAEliminar: Dispositivo | null = null;
  eliminandoDispositivo = false;
  errorEliminar = '';

  // Polling
  private pollingSub: Subscription | null = null;
  private readonly POLL_SECONDS = 10;

  ngOnInit() {
    if (this.usuario) {
      this.editNombre = this.usuario.nombre || '';
      this.editTelefono = this.usuario.telefono || '';
      this.editUbicacion = this.usuario.ubicacion || '';
      this.cargarPerfilFresco();
    }
  }

  ionViewWillEnter() {
    this.usuario = this.auth.getUsuario();
    this.cargarDispositivos();
    this.startPolling();
  }

  ionViewWillLeave() {
    this.stopPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.stopPolling();
    this.pollingSub = interval(this.POLL_SECONDS * 1000).subscribe(() => {
      this.cargarDispositivos();
    });
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
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

        // Compute active count by checking latest reading timestamp per device
        if (this.dispositivos.length === 0) {
          this.activos = 0;
          return;
        }

        const readingChecks = this.dispositivos.map((d) =>
          this.deviceService.getUltimaLectura(d.id).pipe(
            catchError(() => of({ reading: null }))
          )
        );

        forkJoin(readingChecks).subscribe((results) => {
          let activeCount = 0;
          for (const r of results) {
            if (r.reading) {
              const ts = r.reading.timestamp || (r.reading as any).created_at;
              if (ts) {
                const secondsAgo = (Date.now() - new Date(ts).getTime()) / 1000;
                if (secondsAgo <= 30) {
                  activeCount++;
                }
              }
            }
          }
          this.activos = activeCount;
        });
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
        this.profileError = this.extractProfileError(err);
      },
    });
  }

  // ============================================================
  // Seleccionar dispositivo activo
  // ============================================================
  seleccionarDispositivo(device: Dispositivo) {
    this.deviceService.setActiveDevice(device);
    this.router.navigate(['/dashboard']);
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
  // Eliminar dispositivo
  // ============================================================
  abrirDeleteModal(device: Dispositivo) {
    this.dispositivoAEliminar = device;
    this.errorEliminar = '';
    this.mostrarDeleteModal = true;
  }

  cerrarDeleteModal() {
    this.mostrarDeleteModal = false;
    this.dispositivoAEliminar = null;
  }

  confirmarEliminar() {
    if (!this.dispositivoAEliminar) return;

    this.eliminandoDispositivo = true;
    this.errorEliminar = '';

    const deviceId = this.dispositivoAEliminar.id;

    this.deviceService.eliminarDispositivo(deviceId).subscribe({
      next: () => {
        this.eliminandoDispositivo = false;
        this.mostrarDeleteModal = false;

        // Si el dispositivo eliminado era el activo, limpiar selección
        const active = this.deviceService.getActiveDevice();
        if (active && active.id === deviceId) {
          this.deviceService.setActiveDevice(null);
        }

        this.dispositivoAEliminar = null;
        this.cargarDispositivos();
      },
      error: (err) => {
        this.eliminandoDispositivo = false;
        if (err.status === 0) {
          this.errorEliminar = 'No se puede conectar al servidor.';
        } else if (err.status === 401) {
          this.errorEliminar = 'Sesión expirada. Cierra sesión e inicia de nuevo.';
        } else {
          const serverMsg =
            err.error?.mensaje || err.error?.error || err.error?.message;
          this.errorEliminar =
            serverMsg || 'Error al eliminar el dispositivo.';
        }
      },
    });
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

    this.compressImage(file).then((base64) => {
      this.auth.updateProfile({ picture: base64 }).subscribe({
        next: (res) => {
          this.uploadingPhoto = false;
          this.usuario = res.usuario;
          this.profileMsg = 'Foto actualizada correctamente.';
          setTimeout(() => (this.profileMsg = ''), 3000);
        },
        error: (err) => {
          this.uploadingPhoto = false;
          this.profileError = this.extractPhotoError(err);
        },
      });
    }).catch(() => {
      this.uploadingPhoto = false;
      this.profileError = 'No se pudo procesar la imagen. Intenta con otra.';
    });

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
        this.profileError = this.extractPhotoError(err);
      },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  /** Compress an image file to a smaller base64 data URL */
  private compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Error loading image'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > this.COMPRESSED_MAX_WIDTH) {
            height = Math.round(height * (this.COMPRESSED_MAX_WIDTH / width));
            width = this.COMPRESSED_MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', this.COMPRESSED_QUALITY));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /** Extract a user-friendly error message for profile updates */
  private extractProfileError(err: { status?: number; error?: { mensaje?: string; error?: string; message?: string } }): string {
    if (err.status === 0) {
      return 'No se puede conectar al servidor. Verifica tu conexión a internet.';
    }
    if (err.status === 413) {
      return 'Los datos son demasiado grandes. Intenta con una imagen más pequeña.';
    }
    if (err.status === 401) {
      return 'Sesión expirada. Cierra sesión e inicia de nuevo.';
    }
    return err.error?.mensaje || err.error?.error || err.error?.message ||
      'Error al actualizar perfil. Verifica tu conexión.';
  }

  /** Extract a user-friendly error message for photo operations */
  private extractPhotoError(err: { status?: number; error?: { mensaje?: string; error?: string; message?: string } }): string {
    if (err.status === 0) {
      return 'No se puede conectar al servidor. Verifica tu conexión a internet.';
    }
    if (err.status === 413) {
      return 'La imagen es demasiado grande. Intenta con una foto más pequeña.';
    }
    if (err.status === 401) {
      return 'Sesión expirada. Cierra sesión e inicia de nuevo.';
    }
    return err.error?.mensaje || err.error?.error || err.error?.message ||
      'Error al subir la foto. Intenta de nuevo.';
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
