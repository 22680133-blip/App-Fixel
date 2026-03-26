import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Reading {
  device_code: string;
  temperatura: number;
  humedad: number;
  /** Backend may return timestamp, created_at, or fecha */
  timestamp?: string;
  created_at?: string;
  fecha?: string;
}

@Injectable({ providedIn: 'root' })
export class ReadingsService {
  private readonly http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Obtener lecturas del endpoint /api/readings (opcionalmente filtradas por device_code) */
  getReadings(deviceCode?: string): Observable<Reading[]> {
    const params: Record<string, string> = {};
    if (deviceCode) {
      params['device_code'] = deviceCode;
    }
    return this.http.get<Reading[]>(`${this.API}/readings`, { params });
  }

  /** Observable que emite lecturas cada 5 segundos (emite inmediatamente al suscribirse) */
  getRealtimeData(deviceCode?: string): Observable<Reading[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.getReadings(deviceCode).pipe(
        catchError(() => of([] as Reading[]))
      ))
    );
  }
}
