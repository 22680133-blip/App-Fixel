import { Component, OnInit, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FoodService } from '../services/food.service';
import { DeviceService } from '../services/device.service';

interface Food {
  id: number;
  name: string;
  desc: string;
  temp: string;
  icon: string;
}

@Component({
  selector: 'app-pantalla5',
  templateUrl: './pantalla5.page.html',
  styleUrls: ['./pantalla5.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule],
})
export class Pantalla5Page implements OnInit {
  selectedFoods: Food[] = [];
  tempMin = 0;
  tempMax = 8;
  isLoading = false;

  private readonly foodService = inject(FoodService);
  private readonly deviceService = inject(DeviceService);
  private readonly router = inject(Router);

  ngOnInit() {
    this.selectedFoods = this.foodService.getSelectedFoods();
    this.calculateOptimalTemperature();
  }

  calculateOptimalTemperature() {
    if (this.selectedFoods.length === 0) {
      this.tempMin = 2;
      this.tempMax = 8;
      return;
    }

    const temps = this.selectedFoods.map((food) => {
      const range = food.temp.split(' - ');
      return { min: parseInt(range[0]), max: parseInt(range[1]) };
    });

    this.tempMin = Math.min(...temps.map((t) => t.min));
    this.tempMax = Math.max(...temps.map((t) => t.max));
  }

  // ============================================================
  // Guardar configuración de alimentos y navegar al dashboard
  // ============================================================
  continuar() {
    this.isLoading = true;
    const nombres = this.selectedFoods.map((f) => f.name);

    this.deviceService.getDispositivos().subscribe({
      next: (res) => {
        if (res.devices && res.devices.length > 0) {
          // Actualizar el primer dispositivo con la config de alimentos
          const device = res.devices[0];
          this.deviceService
            .guardarConfigAlimentos(device.id, nombres, this.tempMin, this.tempMax)
            .subscribe({
              next: (updated) => {
                // Set as active device so dashboard knows which device to show
                if (updated.device) {
                  this.deviceService.setActiveDevice(updated.device);
                }
                this.router.navigate(['/dashboard'], { replaceUrl: true });
              },
              error: () => this.router.navigate(['/dashboard'], { replaceUrl: true }),
            });
        } else {
          // No tiene dispositivo aún: crear uno con la config
          this.deviceService
            .crearDispositivo({
              nombre: 'Mi Refrigerador',
              alimentos: nombres,
              tempMin: this.tempMin,
              tempMax: this.tempMax,
            })
            .subscribe({
              next: (created) => {
                // Set newly created device as active
                if (created.device) {
                  this.deviceService.setActiveDevice(created.device);
                }
                this.router.navigate(['/dashboard'], { replaceUrl: true });
              },
              error: () => this.router.navigate(['/dashboard'], { replaceUrl: true }),
            });
        }
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      },
    });
  }

  goBack() {
    this.router.navigate(['/pantalla4']);
  }
}

