import { HttpInterceptorFn } from '@angular/common/http';

// Attach credentials (HttpOnly cookie) to every request instead of reading token from localStorage
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authReq = req.clone({ withCredentials: true });
  return next(authReq);
};
