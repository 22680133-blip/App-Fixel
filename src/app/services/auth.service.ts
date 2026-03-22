import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  picture?: string;
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
      .pipe(tap((res) => this.saveSession(res)));
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
}
