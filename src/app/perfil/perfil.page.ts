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

  configurarDispositivo(_device: Dispositivo) {
    this.router.navigate(['/configuracion']);
  }

  agregarDispositivo() {
    this.router.navigate(['/pantalla4']);
  }

  logout() {
    this.auth.logout();
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
