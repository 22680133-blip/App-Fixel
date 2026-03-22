import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { 
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    CommonModule,
    FormsModule,
    HttpClientModule
  ]
})
export class PerfilPage implements OnInit {

  private http = inject(HttpClient);

  API_URL = environment.apiUrl;

  usuario:any = null;
  dispositivos:any[] = [];

  totalDispositivos = 0;
  activos = 0;

  constructor(private router: Router) {}

  ngOnInit() {

    const data = localStorage.getItem('usuario');

    if(data){
      this.usuario = JSON.parse(data);
      this.cargarDispositivos();
    }

  }

  cargarDispositivos(){

    const token = localStorage.getItem('token');

    this.http.get(`${this.API_URL}/devices`,{
      headers:{
        Authorization:`Bearer ${token}`
      }
    }).subscribe((res:any)=>{

      this.dispositivos = res.devices || [];

      this.totalDispositivos = this.dispositivos.length;

      this.activos = this.dispositivos.filter(d=>d.status === 'activo').length;

    });

  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  agregarDispositivo(){
    this.router.navigate(['/agregar-dispositivo']);
  }

}