import { Component, inject, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthSocialService } from '../services/auth-social.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-pantalla2',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pantalla2.page.html',
  styleUrls: ['./pantalla2.page.scss'],
})
export class Pantalla2Page implements OnInit {

  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  attempts: number = 0;
  isLoading: boolean = false;

  emailError: string = '';
  passwordError: string = '';

  API_URL = environment.apiUrl + '/auth';

  // CLIENT ID DE GOOGLE
  GOOGLE_CLIENT_ID = environment.googleClientId;

  private authSocial = inject(AuthSocialService);
  private http = inject(HttpClient);

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadGoogleScript();

    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
      }
    });
  }

  // =============================
  // CARGAR SDK DE GOOGLE
  // =============================
  private loadGoogleScript() {

    if ((window as any).google) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('✅ Google SDK cargado');
    };

    document.head.appendChild(script);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // =============================
  // LOGIN NORMAL
  // =============================
  login() {

    this.emailError = '';
    this.passwordError = '';

    if (!this.email) {
      this.emailError = 'El correo electrónico es requerido';
    }

    if (!this.password) {
      this.passwordError = 'La contraseña es requerida';
    }

    if (this.emailError || this.passwordError) {
      return;
    }

    this.isLoading = true;

    this.http.post(`${this.API_URL}/login`, {
      email: this.email,
      password: this.password
    }).subscribe(
      (res: any) => {

        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));

        this.router.navigate(['/perfil']);

      },
      (err) => {

        const mensaje = err.error?.mensaje || 'Error en autenticación';

        if (mensaje.includes('no encontrado')) {
          this.emailError = 'Correo no registrado';
        } else if (mensaje.includes('incorrecta')) {
          this.passwordError = 'Contraseña incorrecta';
        } else {
          this.passwordError = mensaje;
        }

        this.attempts++;

      }
    ).add(() => {
      this.isLoading = false;
    });
  }

  // =============================
  // LOGIN CON GOOGLE
  // =============================
  loginWithGoogle() {

    console.log('🔵 Iniciando Google Sign-In');

    if (!(window as any).google) {
      alert('Google SDK no cargado');
      return;
    }

    (window as any).google.accounts.id.initialize({
      client_id: this.GOOGLE_CLIENT_ID,
      callback: (response: any) => this.handleGoogleResponse(response)
    });

    (window as any).google.accounts.id.prompt();
  }

  // =============================
  // RESPUESTA DE GOOGLE
  // =============================
  private handleGoogleResponse(response: any) {

  if (!response.credential) {
    alert('Error al obtener token de Google');
    return;
  }

  const idToken = response.credential;

  console.log('✅ Token recibido de Google, enviando a backend...');
  console.log('Token:', idToken);
  console.log('URL:', `${this.API_URL}/google-login`);

  this.http.post(`${this.API_URL}/google-login`, {
    token: idToken
  }).subscribe(
    (res: any) => {

      console.log('✅ Login Google exitoso');

      localStorage.setItem('token', res.token);
      localStorage.setItem('usuario', JSON.stringify(res.usuario));

      this.router.navigate(['/perfil']);

    },
    (err) => {
      console.error('❌ Error login Google:', err);
      alert('Error en autenticación con Google');
    }
  );
}

  goRegister() {
    this.router.navigate(['/pantalla3'], {
      queryParams: { email: this.email }
    });
  }
  loginWithFacebook() {
    console.log('Facebook Login en desarrollo');
    alert('Login con Facebook en desarrollo');
  }
}