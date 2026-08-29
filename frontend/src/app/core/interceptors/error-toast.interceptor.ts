import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../shared/ui/toast/toast.service';

export const errorToastInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Allow requests to opt out of global error toasts via headers
      if (req.headers.has('x-skip-toast-error') || req.headers.has('skip-toast')) {
        return throwError(() => error);
      }

      // Ignore 401 (auth redirect) and 402 (billing lock)
      if (error.status === 401 || error.status === 402) {
        return throwError(() => error);
      }

      // Do NOT show error toast for 404 on GET requests (handled as empty state by components)
      if (error.status === 404 && req.method === 'GET') {
        return throwError(() => error);
      }

      // Extract and humanize error message
      let message = 'An unexpected error occurred. Please try again.';
      let title = 'Request Failed';

      if (error.status === 0) {
        message = 'Cannot connect to server. Please check your internet connection.';
        title = 'Network Offline';
      } else if (error.error?.error) {
        const raw = typeof error.error.error === 'string' ? error.error.error : JSON.stringify(error.error.error);
        if (raw.includes('SQLSTATE') || raw.includes('ERROR: column')) {
          message = 'A temporary database error occurred. The system has automatically fallen back.';
          title = 'System Notice';
        } else {
          message = raw;
        }
      } else if (error.error?.message) {
        message = typeof error.error.message === 'string' ? error.error.message : JSON.stringify(error.error.message);
      } else if (error.message) {
        message = error.message;
      }

      if (error.status === 403) {
        title = 'Access Denied';
      } else if (error.status === 409) {
        title = 'Conflict';
      } else if (error.status >= 500 && title !== 'System Notice') {
        title = 'Server Error';
      }

      toastService.error(message, title);
      return throwError(() => error);
    })
  );
};
