import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // 👈 AGREGAR

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonicModule, CommonModule]
})
export class HomePage implements OnInit {

  constructor(private router: Router, private http: HttpClient) {} // 👈 AGREGAR

  ngOnInit() {
  console.log("SI ENTRO A HOME");
}

  probarAPI() {
    console.log("probando api...");

    this.http.get('https://backend-monitoreo-production.up.railway.app')
      .subscribe({
        next: (res) => {
          console.log("RESPUESTA:", res);
        },
        error: (err) => {
          console.error("ERROR:", err);
        }
      });
  }

  irAPantalla2() {
    this.router.navigate(['/pantalla2']);
  }
}