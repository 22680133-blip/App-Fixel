import { Component, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [IonicModule, CommonModule],
})
export class HomePage implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  ngOnInit() {
    // Si el usuario ya tiene sesión activa, ir directo al dashboard
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  irAPantalla2() {
    this.router.navigate(['/pantalla2']);
  }
}
