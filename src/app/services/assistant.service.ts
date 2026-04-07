import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssistantResponse {
  respuesta: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Enviar pregunta al asistente de IA (interceptor adds JWT) */
  ask(pregunta: string): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>(`${this.API}/assistant`, { pregunta });
  }
}
