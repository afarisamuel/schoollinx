import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../../shared/ui/toast/toast.service';

function isTechnicalError(msg: string): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes('sqlstate') ||
    lower.includes('error:') ||
    lower.includes('pq:') ||
    lower.includes('violates') ||
    lower.includes('foreign key') ||
    lower.includes('constraint') ||
    lower.includes('syntax error') ||
    lower.includes('relation ') ||
    lower.includes('table ') ||
    lower.includes('column ') ||
    lower.includes('gorm query error') ||
    lower.includes('database error') ||
    lower.includes('panic') ||
    lower.includes('connection refused')
  );
}

function extractCleanErrorMessage(error: HttpErrorResponse): string {
  const raw = error.error?.error || error.error?.message;
  if (raw && typeof raw === 'string' && !isTechnicalError(raw)) {
    // If it's a short, readable human message (e.g. "Account verification failed")
    if (raw.length > 0 && raw.length < 120) {
      return raw;
    }
  }
  return '';
}

export const errorToastInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const toastService = inject(ToastService);

  // Check if request explicitly opts out of global error toasts
  const skipToast = req.headers.has('x-skip-toast-error') || req.headers.has('skip-toast') || req.url.includes('/api/public/tenant-info');

  // Strip internal control headers before sending over the wire so CORS preflight does not block them
  const forwardReq = (req.headers.has('x-skip-toast-error') || req.headers.has('skip-toast'))
    ? req.clone({ headers: req.headers.delete('x-skip-toast-error').delete('skip-toast') })
    : req;

  return next(forwardReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Allow requests to opt out of global error toasts via headers or public tenant queries
      if (skipToast) {
        return throwError(() => error);
      }

      // Ignore 401 (auth redirect handled by auth guard) and 402 (billing lock)
      if (error.status === 401 || error.status === 402) {
        return throwError(() => error);
      }

      // Do NOT show error toast for 404 on GET requests (handled as empty state by components)
      if (error.status === 404 && req.method === 'GET') {
        return throwError(() => error);
      }

      let title = 'Server Error';
      let message = 'An unexpected server error occurred. Please try again.';

      const cleanMsg = extractCleanErrorMessage(error);

      if (error.status === 0) {
        title = 'Network Offline';
        message = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.status === 400) {
        title = 'Invalid Request';
        message = cleanMsg || 'Please check the information provided and try again.';
      } else if (error.status === 403) {
        title = 'Access Denied';
        message = 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        title = 'Not Found';
        message = cleanMsg || 'The requested resource was not found.';
      } else if (error.status === 409) {
        title = 'Conflict';
        message = cleanMsg || 'This record conflicts with existing data.';
      } else if (error.status === 422) {
        title = 'Validation Error';
        message = cleanMsg || 'Please verify the submitted data and try again.';
      } else if (error.status >= 500) {
        title = 'Server Error';
        message = 'A server error occurred. Please try again later.';
      } else if (cleanMsg) {
        title = 'Request Failed';
        message = cleanMsg;
      }

      toastService.error(message, title);
      return throwError(() => error);
    })
  );
};
