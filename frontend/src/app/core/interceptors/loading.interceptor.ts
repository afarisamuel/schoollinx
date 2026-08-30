import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Allow silent requests to bypass global loading indicator (e.g. background heartbeats or PWA updates)
  if (req.headers.has('X-Silent-Request')) {
    return next(req);
  }

  const loadingService = inject(LoadingService);
  loadingService.startRequest();

  return next(req).pipe(
    finalize(() => {
      loadingService.endRequest();
    })
  );
};
