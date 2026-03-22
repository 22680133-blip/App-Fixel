import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Dispositivo {
  id: string;
  /** Identificador único legible (ej: "FRIDGE-A1B2"), generado por el backend */
  deviceId: string;
  nombre: string;
  /** Ubicación física del dispositivo (ej: "Cocina", "Almacén") */
  ubicacion: string;
  status: string;
  tempMin: number;
  tempMax: number;
  unidad: string;
  alertas: boolean;
  alimentos: string[];
  /** ID único del ESP32 — se rellena cuando el sensor esté registrado */
  mqttClientId?: string;
  /** Tópico MQTT del ESP32 — se rellena cuando el sensor esté registrado */
  mqttTopic?: string;
}

export interface Lectura {
  temperatura: number;
  humedad: number | null;
  compresor: boolean;
  energia: string;
  timestamp: string;
}

export interface ConfigDispositivo {
  nombre: string;
  tempMin: number;
  tempMax: number;
  unidad: string;
  alertas: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly API = environment.apiUrl;

  /** Dispositivo activo seleccionado por el usuario */
  private activeDeviceSubject = new BehaviorSubject<Dispositivo | null>(this.loadActiveDevice());
  activeDevice$ = this.activeDeviceSubject.asObservable();

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  // ============================================================
  // Estado del dispositivo activo (persiste en localStorage)
  // ============================================================

  getActiveDevice(): Dispositivo | null {
    return this.activeDeviceSubject.value;
  }

  setActiveDevice(device: Dispositivo | null): void {
    this.activeDeviceSubject.next(device);
    if (device) {
      localStorage.setItem('activeDevice', JSON.stringify(device));
    } else {
      localStorage.removeItem('activeDevice');
    }
  }

  private loadActiveDevice(): Dispositivo | null {
    try {
      const raw = localStorage.getItem('activeDevice');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // API CRUD
  // ============================================================

  /** Listar todos los dispositivos del usuario */
  getDispositivos(): Observable<{ devices: Dispositivo[] }> {
    return this.http.get<{ devices: Dispositivo[] }>(`${this.API}/devices`, {
      headers: this.headers,
    });
  }

  /** Obtener un dispositivo por ID */
  getDispositivo(id: string): Observable<{ device: Dispositivo }> {
    return this.http.get<{ device: Dispositivo }>(`${this.API}/devices/${id}`, {
      headers: this.headers,
    });
  }

  /** Crear un nuevo dispositivo (el backend genera el deviceId automáticamente) */
  crearDispositivo(data: Partial<Dispositivo>): Observable<{ device: Dispositivo }> {
    return this.http.post<{ device: Dispositivo }>(`${this.API}/devices`, data, {
      headers: this.headers,
    });
  }

  /** Actualizar configuración de un dispositivo */
  actualizarDispositivo(
    id: string,
    data: Partial<Dispositivo>
  ): Observable<{ device: Dispositivo }> {
    return this.http.put<{ device: Dispositivo }>(`${this.API}/devices/${id}`, data, {
      headers: this.headers,
    });
  }

  /** Guardar configuración de temperatura y alertas (desde pantalla Configuración) */
  guardarConfiguracion(
    id: string,
    config: ConfigDispositivo
  ): Observable<{ device: Dispositivo }> {
    return this.actualizarDispositivo(id, config);
  }

  /** Guardar alimentos seleccionados y rango de temperatura (desde pantalla4/5) */
  guardarConfigAlimentos(
    id: string,
    alimentos: string[],
    tempMin: number,
    tempMax: number
  ): Observable<{ device: Dispositivo }> {
    return this.actualizarDispositivo(id, { alimentos, tempMin, tempMax });
  }

  /** Última lectura de temperatura del ESP32 */
  getUltimaLectura(deviceId: string): Observable<{ reading: Lectura | null }> {
    return this.http.get<{ reading: Lectura | null }>(
      `${this.API}/readings/latest/${deviceId}`,
      { headers: this.headers }
    );
  }

  /** Historial de lecturas de las últimas 24 horas */
  getHistorial(deviceId: string): Observable<{ readings: Lectura[] }> {
    return this.http.get<{ readings: Lectura[] }>(
      `${this.API}/readings/history/${deviceId}`,
      { headers: this.headers }
    );
  }
}
