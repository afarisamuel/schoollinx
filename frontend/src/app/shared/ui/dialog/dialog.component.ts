import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService, DialogRequest } from './dialog.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-dialog',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dialog.component.html',
    animations: [
        trigger('dialogAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
                animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
            ]),
            transition(':leave', [
                animate('150ms cubic-bezier(0.7, 0, 0.84, 0)', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }))
            ])
        ])
    ]
})
export class DialogComponent implements OnInit {
    currentRequest = signal<DialogRequest | null>(null);

    constructor(private dialogService: DialogService) {}

    ngOnInit() {
        this.dialogService.dialogState$.subscribe(request => {
            this.currentRequest.set(request);
        });
    }

    close(result: boolean = false) {
        const req = this.currentRequest();
        if (req) {
            req.resolve(result);
        }
        this.currentRequest.set(null);
    }
}
