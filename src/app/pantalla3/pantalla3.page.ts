import { Component, OnInit, inject, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pantalla3',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './pantalla3.page.html',
  styleUrls: ['./pantalla3.page.scss'],
})
export class Pantalla3Page implements OnInit {
  nombre = '';
  email = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  showConfirm = false;
  isLoading = false;
  googleReady = false;

  nombreError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly zone = inject(NgZone);

  ngOnInit() {
    this.loadGoogleScript();
    this.route.queryParams.subscribe((params) => {
      if (params['email']) this.email = params['email'];
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

  private initializeGoogleButton(retries = 3) {
    const google = (window as any).google;
    if (!google?.accounts?.id) return;

    try {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleResponse(response),
        use_fedcm_for_prompt: true,
      });

      // Render a real Google Sign-In button (more reliable than One Tap prompt)
      const container = document.getElementById('google-btn-register');
      if (container) {
        google.accounts.id.renderButton(container, {
          type: 'icon',
          shape: 'circle',
          theme: 'filled_black',
          size: 'large',
        });
        this.zone.run(() => {
          this.googleReady = true;
        });
      } else if (retries > 0) {
        // Container may not be in DOM yet — retry after a short delay
        setTimeout(() => this.initializeGoogleButton(retries - 1), 500);
      }
    } catch (err) {
      console.error(
        `[Google Sign-In] Error al inicializar. Origen actual: "${window.location.origin}". ` +
        'Asegúrate de registrar este origen en Google Cloud Console → Credenciales → OAuth 2.0 → Orígenes autorizados de JavaScript.',
        err
      );
    }
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ============================================================
  // Registro con email y contraseña
  // ============================================================
  register() {
    this.nombreError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

    if (!this.nombre) this.nombreError = 'El nombre es requerido';
    else if (this.nombre.length < 3) this.nombreError = 'El nombre debe tener al menos 3 caracteres';

    if (!this.email) this.emailError = 'El correo electrónico es requerido';
    else if (!this.isValidEmail(this.email)) this.emailError = 'Ingresa un correo válido';

    if (!this.password) this.passwordError = 'La contraseña es requerida';
    else if (this.password.length < 6) this.passwordError = 'La contraseña debe tener al menos 6 caracteres';

    if (!this.confirmPassword) this.confirmPasswordError = 'Confirma tu contraseña';
    else if (this.password !== this.confirmPassword) this.confirmPasswordError = 'Las contraseñas no coinciden';

    if (this.nombreError || this.emailError || this.passwordError || this.confirmPasswordError) return;

    this.isLoading = true;

    this.auth.register(this.nombre, this.email, this.password).subscribe({
      next: () => {
        // Registro exitoso: ir a pantalla4 para configurar el primer dispositivo
        this.router.navigate(['/pantalla4'], { replaceUrl: true });
      },
      error: (err) => {
        let mensaje: string;
        if (err.status === 0) {
          mensaje = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
        } else {
          mensaje = err.error?.mensaje || 'Error al registrar. Intenta de nuevo.';
        }
        if (mensaje.includes('existe') || mensaje.includes('registrado')) {
          this.emailError = 'Este correo ya está registrado';
        } else {
          this.emailError = mensaje;
        }
        this.isLoading = false;
      },
    });
  }

  // ============================================================
  // Registro / Login con Google — handled by the rendered Google button
  // ============================================================
  private handleGoogleResponse(response: any) {
    if (!response.credential) {
      this.zone.run(() => {
        this.isLoading = false;
        this.emailError = 'No se pudo obtener el token de Google. Intenta de nuevo.';
      });
      return;
    }

    this.zone.run(() => {
      this.isLoading = true;
      this.auth.loginWithGoogle(response.credential).subscribe({
        next: () => this.router.navigate(['/pantalla4'], { replaceUrl: true }),
        error: (err) => {
          if (err.status === 0) {
            this.emailError = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
          } else {
            this.emailError = err.error?.mensaje || 'Error en autenticación con Google';
          }
          this.isLoading = false;
        },
      });
    });
  }

  loginWithFacebook() {
    const FB = (window as any).FB;
    if (!FB) {
      this.emailError = 'Facebook SDK no disponible. Intenta de nuevo.';
      return;
    }
    FB.login(
      (fbResponse: any) => {
        if (!fbResponse.authResponse) return;
        this.zone.run(() => {
          this.isLoading = true;
          const { accessToken, userID } = fbResponse.authResponse;
          this.auth.loginWithFacebook(accessToken, userID).subscribe({
            next: () => this.router.navigate(['/pantalla4'], { replaceUrl: true }),
            error: (err) => {
              if (err.status === 0) {
                this.emailError = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
              } else {
                this.emailError = err.error?.mensaje || 'Error en autenticación con Facebook';
              }
              this.isLoading = false;
            },
          });
        });
      },
      { scope: 'public_profile,email' }
    );
  }

  goBack() {
    this.router.navigate(['/pantalla2']);
  }
}
