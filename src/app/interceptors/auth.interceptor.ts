import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP interceptor that attaches the JWT token to every outgoing request
 * targeting the application API. Public endpoints (like /api/readings and
 * /api/ingest) still work because the backend simply ignores the header
 * when no auth middleware is applied.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(cloned);
  }

  return next(req);
};
