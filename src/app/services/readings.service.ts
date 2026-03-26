import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Reading {
  device_code: string;
  temperatura: number;
  humedad: number;
  /** Backend may return either timestamp or created_at */
  timestamp?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ReadingsService {
  private readonly http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Obtener todas las lecturas del endpoint /api/readings */
  getReadings(): Observable<Reading[]> {
    return this.http.get<Reading[]>(`${this.API}/readings`);
  }

  /** Observable que emite lecturas cada 5 segundos (emite inmediatamente al suscribirse) */
  getRealtimeData(): Observable<Reading[]> {
    return interval(5000).pipe(
      startWith(0),
      switchMap(() => this.getReadings())
    );
  }
}
