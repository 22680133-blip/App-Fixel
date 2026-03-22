import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-pantalla3',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pantalla3.page.html',
  styleUrls: ['./pantalla3.page.scss'],
})
export class Pantalla3Page implements OnInit {

  // DATOS DEL FORM
  nombre: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  // CONTROL DE PASSWORD
  showPassword: boolean = false;
  showConfirm: boolean = false;
  isLoading: boolean = false;

  // CONTROL DE ERRORES INDIVIDUALES
  nombreError: string = '';
  emailError: string = '';
  passwordError: string = '';
  confirmPasswordError: string = '';

  // URL DEL BACKEND
  API_URL = 'http://localhost:3000/api/auth';

  // Google Client ID
  GOOGLE_CLIENT_ID = '509438391464-s878u81t3tenpf3pad0hvhsp17i0hn7c.apps.googleusercontent.com';

  constructor(
    private http: HttpClient, 
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Si viene desde pantalla2, pre-llenar el email
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.email = params['email'];
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm() {
    this.showConfirm = !this.showConfirm;
  }

  /**
   * Validar formato de email
   */
  isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  register() {
    // Limpiar errores previos
    this.nombreError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

    // Validar NOMBRE
    if (!this.nombre) {
      this.nombreError = 'El nombre es requerido';
    } else if (this.nombre.length < 3) {
      this.nombreError = 'El nombre debe tener al menos 3 caracteres';
    }

    // Validar EMAIL
    if (!this.email) {
      this.emailError = 'El correo electrónico es requerido';
    } else if (!this.isValidEmail(this.email)) {
      this.emailError = 'Ingresa un correo válido';
    }

    // Validar PASSWORD
    if (!this.password) {
      this.passwordError = 'La contraseña es requerida';
    } else if (this.password.length < 6) {
      this.passwordError = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validar CONFIRM PASSWORD
    if (!this.confirmPassword) {
      this.confirmPasswordError = 'Confirma tu contraseña';
    } else if (this.password !== this.confirmPassword) {
      this.confirmPasswordError = 'Las contraseñas no coinciden';
    }

    // Si hay error en ANY campo, detener aquí
    if (this.nombreError || this.emailError || this.passwordError || this.confirmPasswordError) {
      return;
    }

    this.isLoading = true;
    console.log('📝 Registrando usuario:', this.email);

    this.http.post(`${this.API_URL}/register`, {
      nombre: this.nombre,
      email: this.email,
      password: this.password
    }).subscribe(
      (res: any) => {
        console.log('✅ Usuario registrado:', res);
        
        // Volver a pantalla2 con el email pre-llenado
        this.router.navigate(['/pantalla2'], {
          queryParams: { email: this.email }
        });
      },
      (err) => {
        console.error('❌ Error:', err);
        const mensaje = err.error?.mensaje || "Error al registrar";
        
        // Validar qué tipo de error es
        if (mensaje.includes('existe') || mensaje.includes('duplicado')) {
          this.emailError = 'Este correo ya está registrado';
        } else {
          this.emailError = mensaje;
        }
      }
    ).add(() => {
      this.isLoading = false;
    });
  }

  goBack() {
    this.router.navigate(['/pantalla2']);
  }

  loginWithGoogle() {
    console.log('🔵 Iniciando Google Sign-In...');
    
    if (!(window as any).google) {
      console.error('❌ Google SDK no cargado');
      alert('Google Sign-In no disponible');
      return;
    }

    this.isLoading = true;

    // Usar Google Identity Services
    (window as any).google.accounts.id.initialize({
      client_id: this.GOOGLE_CLIENT_ID,
      callback: (response: any) => this.handleGoogleResponse(response),
      use_fedcm_for_prompt: false
    });

    // Mostrar el selector de cuentas de Google
    (window as any).google.accounts.id.prompt();
  }

  private handleGoogleResponse(response: any) {
    if (!response.credential) {
      console.error('❌ No se recibió token de Google');
      this.isLoading = false;
      alert('Error en Google Sign-In');
      return;
    }

    const token = response.credential;
    console.log('✅ Token recibido de Google');

    // Enviar token al backend para validación
    this.http.post(`${this.API_URL}/google-login`, {
      token: token
    }).subscribe(
      (res: any) => {
        console.log('✅ Autenticación Google exitosa:', res);
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
        
        // Volver a pantalla2 después del login exitoso
        this.router.navigate(['/dashboard']);
      },
      (err) => {
        console.error('❌ Error en login Google:', err);
        alert('Error en autenticación con Google');
      }
    ).add(() => {
      this.isLoading = false;
    });
  }

  loginWithFacebook() {
    console.log('Facebook Login en desarrollo...');
    alert('Facebook Login en desarrollo');
  }
}
