import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pantalla3Page } from './pantalla3.page';

describe('Pantalla3Page', () => {
  let component: Pantalla3Page;
  let fixture: ComponentFixture<Pantalla3Page>;

  beforeEach(() => {
    fixture = TestBed.createComponent(Pantalla3Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
