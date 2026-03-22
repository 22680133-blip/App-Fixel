import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  picture?: string;
  telefono?: string;
  ubicacion?: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly API = `${environment.apiUrl}/auth`;

  /** Registro con email y contraseña */
  register(nombre: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/register`, { nombre, email, password })
      .pipe(
        tap((res) => {
          if (res.token) {
            this.saveSession(res);
          }
        }),
        // If register didn't return a token, auto-login to get one
        switchMap((res) => {
          if (res.token) {
            return of(res);
          }
          return this.http
            .post<AuthResponse>(`${this.API}/login`, { email, password })
            .pipe(tap((loginRes) => this.saveSession(loginRes)));
        }),
      );
  }

  /** Login con email y contraseña */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/login`, { email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  /** Login con token de Google (idToken del SDK de Google) */
  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/google-login`, { token: idToken })
      .pipe(tap((res) => this.saveSession(res)));
  }

  /** Login con Facebook (accessToken y userID del SDK de Facebook) */
  loginWithFacebook(accessToken: string, userID: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/facebook-login`, { accessToken, userID })
      .pipe(tap((res) => this.saveSession(res)));
  }

  /** Cerrar sesión y redirigir al login */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/pantalla2']);
  }

  /** Devuelve true si hay un token guardado */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /** Devuelve el token JWT o null */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /** Devuelve el usuario guardado en sesión o null */
  getUsuario(): Usuario | null {
    const data = localStorage.getItem('usuario');
    return data ? (JSON.parse(data) as Usuario) : null;
  }

  private saveSession(res: AuthResponse): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('usuario', JSON.stringify(res.usuario));
  }

  /** Actualizar perfil del usuario */
  updateProfile(data: Partial<Usuario>): Observable<{ usuario: Usuario }> {
    const headers = { Authorization: `Bearer ${this.getToken()}` };
    return this.http
      .put<{ usuario: Usuario }>(`${this.API}/profile`, data, { headers })
      .pipe(
        tap((res) => {
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
        }),
      );
  }

  /** Cambiar contraseña */
  changePassword(currentPassword: string, newPassword: string): Observable<{ mensaje: string }> {
    const headers = { Authorization: `Bearer ${this.getToken()}` };
    return this.http.put<{ mensaje: string }>(
      `${this.API}/password`,
      { currentPassword, newPassword },
      { headers },
    );
  }
}
