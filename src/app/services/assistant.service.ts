import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AssistantResponse {
  respuesta: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly API = environment.apiUrl;

  /** Enviar pregunta al asistente de IA */
  ask(pregunta: string): Observable<AssistantResponse> {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return this.http.post<AssistantResponse>(`${this.API}/assistant`, { pregunta }, { headers });
  }
}
