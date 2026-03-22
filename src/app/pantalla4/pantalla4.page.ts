import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { FoodService } from '../services/food.service';

@Component({
  selector: 'app-pantalla4',
  templateUrl: './pantalla4.page.html',
  styleUrls: ['./pantalla4.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule],
})
export class Pantalla4Page {
  foods = [
    { id: 1, name: 'Lácteos', desc: 'Leche, Queso, Yogurt', temp: '1°C - 4°C', icon: 'assets/img/lacteos.png' },
    { id: 2, name: 'Carnes', desc: 'Res, Cerdo, Pollo', temp: '0°C - 4°C', icon: 'assets/img/carne.png' },
    { id: 3, name: 'Pescados', desc: 'Salmón, Atún', temp: '0°C - 2°C', icon: 'assets/img/pescado.png' },
    { id: 4, name: 'Vegetales', desc: 'Verduras frescas', temp: '4°C - 8°C', icon: 'assets/img/vegetales.png' },
    { id: 5, name: 'Frutas', desc: 'Manzana, Piña', temp: '4°C - 8°C', icon: 'assets/img/frutas.png' },
    { id: 6, name: 'Uso General', desc: 'Otros alimentos', temp: '0°C - 4°C', icon: 'assets/img/general.png' },
  ];

  selectedFoods: number[] = [];

  private readonly router = inject(Router);
  private readonly foodService = inject(FoodService);

  toggleFood(id: number) {
    const index = this.selectedFoods.indexOf(id);
    if (index > -1) {
      this.selectedFoods.splice(index, 1);
    } else {
      this.selectedFoods.push(id);
    }
  }

  isSelected(id: number): boolean {
    return this.selectedFoods.includes(id);
  }

  continuar() {
    const selectedFoodObjects = this.foods.filter((food) => this.selectedFoods.includes(food.id));
    this.foodService.setSelectedFoods(selectedFoodObjects);
    this.router.navigate(['/pantalla5']);
  }
}

