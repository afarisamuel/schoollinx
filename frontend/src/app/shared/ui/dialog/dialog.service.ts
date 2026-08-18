import { Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type DialogType = 'info' | 'success' | 'error' | 'warning' | 'danger';

export interface DialogRequest {
    title: string;
    message: string;
    type: DialogType;
    actionText: string;
    isConfirm: boolean;
    resolve: (value: boolean) => void;
}

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    private dialogSubject = new Subject<DialogRequest>();
    public dialogState$ = this.dialogSubject.asObservable();

    /**
     * Shows an informational alert dialog
     */
    alert(message: string, title: string = 'Notice', type: DialogType = 'info', actionText: string = 'Understood'): Observable<boolean> {
        return new Observable(observer => {
            this.dialogSubject.next({
                title,
                message,
                type,
                actionText,
                isConfirm: false,
                resolve: (val: boolean) => {
                    observer.next(val);
                    observer.complete();
                }
            });
        });
    }

    /**
     * Shows a confirmation dialog, expecting user decision
     */
    confirm(message: string, title: string = 'Action Required', type: DialogType = 'warning', actionText: string = 'Proceed'): Observable<boolean> {
        return new Observable(observer => {
            this.dialogSubject.next({
                title,
                message,
                type,
                actionText,
                isConfirm: true,
                resolve: (val: boolean) => {
                    observer.next(val);
                    observer.complete();
                }
            });
        });
    }
}
