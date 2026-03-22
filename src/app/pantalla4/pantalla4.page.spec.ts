import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pantalla4Page } from './pantalla4.page';

describe('Pantalla4Page', () => {
  let component: Pantalla4Page;
  let fixture: ComponentFixture<Pantalla4Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Pantalla4Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
