import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FoodService } from '../services/food.service';

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
  imports: [IonContent, CommonModule]
})
export class Pantalla5Page implements OnInit {
  selectedFoods: Food[] = [];
  tempMin: number = 0;
  tempMax: number = 8;

  constructor(private foodService: FoodService, private router: Router) { }

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

    const temps = this.selectedFoods.map(food => {
      const range = food.temp.split(' - ');
      return {
        min: parseInt(range[0]),
        max: parseInt(range[1])
      };
    });

    // Temperatura mínima = la más baja de todas
    // Temperatura máxima = la más alta de todas
    this.tempMin = Math.min(...temps.map(t => t.min));
    this.tempMax = Math.max(...temps.map(t => t.max));
  }

  continuar() {
    this.router.navigate(['/dashboard']);
  }

  goBack() {
    this.router.navigate(['/pantalla4']);
  }

}
