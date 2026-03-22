import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuracion',
  templateUrl: './configuracion.page.html',
  styleUrls: ['./configuracion.page.scss'],
  standalone: true,
  imports: [IonContent, FormsModule, CommonModule]
})
export class ConfiguracionPage {

  deviceName = "Refrigerador Cocina"

  minTemp = 2
  maxTemp = 8

  alerts = true

  unit = "C"

  constructor(private router: Router) {}

  guardar(){

    console.log("Configuración guardada")

    console.log(this.deviceName)
    console.log(this.minTemp)
    console.log(this.maxTemp)
    console.log(this.unit)
    console.log(this.alerts)

  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

}
