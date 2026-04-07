import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Dispositivo {
  id: number;
  /** Identificador único legible (ej: "FRIDGE-A1B2"), generado por el backend */
  deviceId: string;
  nombre: string;
  /** Ubicación física del dispositivo (ej: "Cocina", "Almacén") */
  ubicacion: string;
  status: string;
  limiteMin: number;
  limiteMax: number;
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
  limiteMin: number;
  limiteMax: number;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Dispositivo activo seleccionado por el usuario */
  private activeDeviceSubject = new BehaviorSubject<Dispositivo | null>(this.loadActiveDevice());
  activeDevice$ = this.activeDeviceSubject.asObservable();

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
  // API CRUD (interceptor adds JWT automatically)
  // ============================================================

  /** Listar todos los dispositivos del usuario */
  getDispositivos(): Observable<{ devices: Dispositivo[] }> {
    return this.http.get<{ devices: Dispositivo[] }>(`${this.API}/devices`);
  }

  /** Obtener un dispositivo por ID */
  getDispositivo(id: number): Observable<{ device: Dispositivo }> {
    return this.http.get<{ device: Dispositivo }>(`${this.API}/devices/${id}`);
  }

  /** Crear un nuevo dispositivo (el backend genera el deviceId automáticamente) */
  crearDispositivo(data: Partial<Dispositivo>): Observable<{ device: Dispositivo }> {
    return this.http.post<{ device: Dispositivo }>(`${this.API}/devices`, data);
  }

  /** Actualizar configuración de un dispositivo */
  actualizarDispositivo(
    id: number,
    data: Partial<Dispositivo>
  ): Observable<{ device: Dispositivo }> {
    return this.http.put<{ device: Dispositivo }>(`${this.API}/devices/${id}`, data);
  }

  /** Eliminar un dispositivo */
  eliminarDispositivo(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.API}/devices/${id}`);
  }

  /** Guardar configuración de temperatura y alertas (desde pantalla Configuración) */
  guardarConfiguracion(
    id: number,
    config: ConfigDispositivo
  ): Observable<{ device: Dispositivo }> {
    return this.actualizarDispositivo(id, config);
  }

  /** Guardar alimentos seleccionados y rango de temperatura (desde pantalla4/5) */
  guardarConfigAlimentos(
    id: number,
    alimentos: string[],
    limiteMin: number,
    limiteMax: number
  ): Observable<{ device: Dispositivo }> {
    return this.actualizarDispositivo(id, { limiteMin, limiteMax });
  }

  /** Última lectura de temperatura del ESP32 */
  getUltimaLectura(deviceId: number): Observable<{ reading: Lectura | null }> {
    return this.http.get<{ readings: any[] }>(
      `${this.API}/devices/${deviceId}/readings`,
      { params: { limit: '1' } }
    ).pipe(
      map(res => ({
        reading: res.readings && res.readings.length > 0
          ? this.mapRowToLectura(res.readings[0])
          : null
      }))
    );
  }

  /** Historial de lecturas de las últimas 24 horas */
  getHistorial(deviceId: number): Observable<{ readings: Lectura[] }> {
    return this.http.get<{ readings: any[] }>(
      `${this.API}/devices/${deviceId}/readings`,
      { params: { limit: '100' } }
    ).pipe(
      map(res => ({
        readings: (res.readings || [])
          .map((r: any) => this.mapRowToLectura(r))
          .reverse()  // DB returns DESC order, chart needs ASC
      }))
    );
  }

  /** Maps a raw DB row (which may use fecha/created_at/timestamp) to Lectura */
  private mapRowToLectura(row: any): Lectura {
    return {
      temperatura: parseFloat(row.temperatura),
      humedad: row.humedad != null ? parseFloat(row.humedad) : null,
      compresor: row.compresor ?? true,
      energia: row.energia || 'Normal',
      timestamp: row.timestamp || row.fecha || row.created_at,
    };
  }
}
