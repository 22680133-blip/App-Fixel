import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pantalla2Page } from './pantalla2.page';

describe('Pantalla2Page', () => {
  let component: Pantalla2Page;
  let fixture: ComponentFixture<Pantalla2Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Pantalla2Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
