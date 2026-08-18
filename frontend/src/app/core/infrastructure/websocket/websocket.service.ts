import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable, Subscription, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { retryWhen, delayWhen } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../../environments/environment';

export interface AppNotification {
    id: string;
    type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    action_url?: string;
}

@Injectable({
    providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
    private socket$!: WebSocketSubject<any>;
    private messagesSubject$ = new Subject<AppNotification>();
    public messages$ = this.messagesSubject$.asObservable();
    private reconnectSubscription?: Subscription;

    constructor(
        @Inject(PLATFORM_ID) private platformId: Object,
        private authService: AuthService
    ) {
        if (isPlatformBrowser(this.platformId)) {
            // Delay connection slightly to ensure auth token is loaded from storage
            setTimeout(() => this.connect(), 1000);
        }
    }

    private connect(): void {
        const token = this.authService.getToken();
        
        let tenant = '';
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            tenant = parts[0];
            if (tenant === 'www' || tenant === 'localhost' || tenant === '127') {
                tenant = '';
            }
        }
        
        if (!token) return;

        // Convert http:// API URL to ws:// for the websocket endpoint
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Using window.location.host instead of environment.apiUrl to avoid hardcoded ports 
        // if apiUrl is just a relative path, but let's parse environment.apiUrl
        let apiHost = '';
        if (environment.apiUrl.startsWith('http')) {
             apiHost = new URL(environment.apiUrl).host;
        } else {
             apiHost = window.location.host;
        }
        
        const WS_ENDPOINT = `${wsProtocol}//${apiHost}/api/ws?token=${token}&tenant=${tenant}`;

        this.socket$ = webSocket(WS_ENDPOINT);

        this.socket$.pipe(
            retryWhen(errors =>
                errors.pipe(
                    delayWhen(() => timer(5000))
                )
            )
        ).subscribe({
            next: (msg: any) => {
                // If it's a notification, push it to the stream
                if (msg && msg.type) {
                    this.messagesSubject$.next(msg as AppNotification);
                }
            },
            error: err => console.error('WebSocket Error:', err),
            complete: () => console.log('WebSocket closed')
        });
    }

    public sendMessage(msg: any): void {
        if (this.socket$) {
            this.socket$.next(msg);
        }
    }

    ngOnDestroy(): void {
        if (this.socket$) {
            this.socket$.complete();
        }
        if (this.reconnectSubscription) {
            this.reconnectSubscription.unsubscribe();
        }
    }
}
