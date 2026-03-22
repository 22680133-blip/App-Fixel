import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pantalla5Page } from './pantalla5.page';

describe('Pantalla5Page', () => {
  let component: Pantalla5Page;
  let fixture: ComponentFixture<Pantalla5Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Pantalla5Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
