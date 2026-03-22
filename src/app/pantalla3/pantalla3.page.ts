import { Component, OnInit, inject } from '@angular/core';
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

  nombreError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit() {
    this.loadGoogleScript();
    this.route.queryParams.subscribe((params) => {
      if (params['email']) this.email = params['email'];
    });
  }

  private loadGoogleScript() {
    if ((window as any).google) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
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
        const mensaje = err.error?.mensaje || 'Error al registrar';
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
  // Registro / Login con Google
  // ============================================================
  loginWithGoogle() {
    if (!(window as any).google) {
      alert('Google Sign-In no disponible');
      return;
    }

    this.isLoading = true;

    (window as any).google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleGoogleResponse(response),
      use_fedcm_for_prompt: false,
    });

    (window as any).google.accounts.id.prompt();
  }

  private handleGoogleResponse(response: any) {
    if (!response.credential) {
      this.isLoading = false;
      alert('Error en Google Sign-In');
      return;
    }

    this.auth.loginWithGoogle(response.credential).subscribe({
      next: () => this.router.navigate(['/pantalla4'], { replaceUrl: true }),
      error: () => {
        alert('Error en autenticación con Google');
        this.isLoading = false;
      },
    });
  }

  loginWithFacebook() {
    const FB = (window as any).FB;
    if (!FB) {
      alert('Facebook SDK no disponible');
      return;
    }
    FB.login(
      (fbResponse: any) => {
        if (!fbResponse.authResponse) return;
        this.isLoading = true;
        const { accessToken, userID } = fbResponse.authResponse;
        this.auth.loginWithFacebook(accessToken, userID).subscribe({
          next: () => this.router.navigate(['/pantalla4'], { replaceUrl: true }),
          error: () => {
            alert('Error en autenticación con Facebook');
            this.isLoading = false;
          },
        });
      },
      { scope: 'public_profile,email' }
    );
  }

  goBack() {
    this.router.navigate(['/pantalla2']);
  }
}

