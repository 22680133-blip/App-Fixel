import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * HTTP interceptor that attaches the JWT token to every outgoing request
 * and handles 401 responses by clearing the session and redirecting to login.
 *
 * Auth endpoints (login, register, social login) are excluded from the
 * auto-redirect logic since their 401s are expected (wrong credentials).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      // Only auto-redirect on 401 for authenticated (non-login) requests
      const isAuthEndpoint = req.url.includes('/auth/login')
        || req.url.includes('/auth/register')
        || req.url.includes('/auth/google-login')
        || req.url.includes('/auth/facebook-login');

      if (err.status === 401 && token && !isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('activeDevice');
        router.navigate(['/pantalla2']);
      }
      return throwError(() => err);
    })
  );
};
