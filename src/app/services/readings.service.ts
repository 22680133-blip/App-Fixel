import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Reading {
  device_code: string;
  temperatura: number;
  humedad: number;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ReadingsService {
  private readonly http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Obtener todas las lecturas del endpoint /api/readings */
  getReadings(): Observable<Reading[]> {
    return this.http.get<Reading[]>(`${this.API}/readings`);
  }
}
