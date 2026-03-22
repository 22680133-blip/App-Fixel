import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface Food {
  id: number;
  name: string;
  desc: string;
  temp: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class FoodService {
  private selectedFoodsSubject = new BehaviorSubject<Food[]>([]);
  selectedFoods$ = this.selectedFoodsSubject.asObservable();

  constructor() { }

  setSelectedFoods(foods: Food[]) {
    this.selectedFoodsSubject.next(foods);
  }

  getSelectedFoods(): Food[] {
    return this.selectedFoodsSubject.value;
  }
}
