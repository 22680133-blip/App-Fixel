import { Component, inject, OnInit, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DeviceService } from '../services/device.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pantalla2',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './pantalla2.page.html',
  styleUrls: ['./pantalla2.page.scss'],
})
export class Pantalla2Page implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;
  googleReady = false;

  emailError = '';
  passwordError = '';

  private readonly auth = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);

  ngOnInit() {
    this.loadGoogleScript();

    this.route.queryParams.subscribe((params) => {
      if (params['email']) {
        this.email = params['email'];
      }
    });
  }

  private loadGoogleScript() {
    if ((window as any).google?.accounts) {
      this.initializeGoogleButton();
      return;
    }

    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => this.initializeGoogleButton());
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initializeGoogleButton();
    document.head.appendChild(script);
  }

  private initializeGoogleButton() {
    const google = (window as any).google;
    if (!google?.accounts?.id) return;

    try {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleResponse(response),
        use_fedcm_for_prompt: true,
      });

      // Render a real Google Sign-In button (more reliable than One Tap prompt)
      const container = document.getElementById('google-btn-login');
      if (container) {
        google.accounts.id.renderButton(container, {
          type: 'icon',
          shape: 'circle',
          theme: 'filled_black',
          size: 'large',
        });
      }

      this.zone.run(() => {
        this.googleReady = true;
      });
    } catch (err) {
      console.error(
        `[Google Sign-In] Error al inicializar. Origen actual: "${window.location.origin}". ` +
        'Asegúrate de registrar este origen en Google Cloud Console → Credenciales → OAuth 2.0 → Orígenes autorizados de JavaScript.',
        err
      );
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // ============================================================
  // Login con email y contraseña
  // ============================================================
  login() {
    this.emailError = '';
    this.passwordError = '';

    if (!this.email) this.emailError = 'El correo electrónico es requerido';
    if (!this.password) this.passwordError = 'La contraseña es requerida';
    if (this.emailError || this.passwordError) return;

    this.isLoading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.navegarTrasLogin(),
      error: (err) => {
        const mensaje = err.error?.mensaje || 'Error en autenticación';
        if (mensaje.includes('no encontrado')) {
          this.emailError = 'Correo no registrado';
        } else if (mensaje.includes('incorrecta')) {
          this.passwordError = 'Contraseña incorrecta';
        } else {
          this.passwordError = mensaje;
        }
        this.isLoading = false;
      },
    });
  }

  // ============================================================
  // Login con Google — handled by the rendered Google button
  // ============================================================
  private handleGoogleResponse(response: any) {
    if (!response.credential) {
      this.zone.run(() => {
        alert('Error al obtener token de Google');
      });
      return;
    }

    this.zone.run(() => {
      this.isLoading = true;
      this.auth.loginWithGoogle(response.credential).subscribe({
        next: () => this.navegarTrasLogin(),
        error: () => {
          alert('Error en autenticación con Google');
          this.isLoading = false;
        },
      });
    });
  }

  // ============================================================
  // Login con Facebook
  // ============================================================
  loginWithFacebook() {
    const FB = (window as any).FB;
    if (!FB) {
      alert('Facebook SDK no cargado. Intenta de nuevo en un momento.');
      return;
    }

    FB.login(
      (fbResponse: any) => {
        if (!fbResponse.authResponse) return;
        this.zone.run(() => {
          this.isLoading = true;
          const { accessToken, userID } = fbResponse.authResponse;
          this.auth.loginWithFacebook(accessToken, userID).subscribe({
            next: () => this.navegarTrasLogin(),
            error: () => {
              alert('Error en autenticación con Facebook');
              this.isLoading = false;
            },
          });
        });
      },
      { scope: 'public_profile,email' }
    );
  }

  // ============================================================
  // Navegación post-login: si tiene dispositivos → dashboard, si no → pantalla4
  // ============================================================
  private navegarTrasLogin() {
    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        if (res.devices && res.devices.length > 0) {
          this.router.navigate(['/dashboard'], { replaceUrl: true });
        } else {
          this.router.navigate(['/pantalla4'], { replaceUrl: true });
        }
      },
      error: () => {
        // Si falla la consulta de dispositivos, ir al dashboard igualmente
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      },
    });
  }

  goRegister() {
    this.router.navigate(['/pantalla3'], { queryParams: { email: this.email } });
  }
}
