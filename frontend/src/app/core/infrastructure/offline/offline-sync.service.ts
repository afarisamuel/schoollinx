import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { SwUpdate } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

export interface SyncOperation {
    id: string;
    url: string;
    method: string;
    body: any;
    timestamp: Date;
}

export interface SyncConflict {
    id: string;
    operation: SyncOperation;
    serverMessage: string;
    resolved: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class OfflineSyncService {
    private http = inject(HttpClient);
    private swUpdate = inject(SwUpdate);

    isOnline = signal(navigator.onLine);
    pendingOperations = signal<SyncOperation[]>([]);
    syncConflicts = signal<SyncConflict[]>([]);

    private dbName = 'BasicSmsOfflineDB';
    private dbVersion = 1;
    private db: IDBDatabase | null = null;

    constructor() {
        this.initDB().then(() => {
            this.initNetworkListeners();
            this.loadPendingOperations();
            this.loadConflicts();
        });
        
        if (this.swUpdate.isEnabled) {
            this.swUpdate.versionUpdates.subscribe(evt => {
                if (evt.type === 'VERSION_READY') {
                    if (confirm('New version available. Load New Version?')) {
                        window.location.reload();
                    }
                }
            });
        }
    }

    private initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('operations')) {
                    db.createObjectStore('operations', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('conflicts')) {
                    db.createObjectStore('conflicts', { keyPath: 'id' });
                }
            };
        });
    }

    private initNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline.set(true);
            this.syncData();
        });
        window.addEventListener('offline', () => {
            this.isOnline.set(false);
        });
    }

    private loadPendingOperations() {
        if (!this.db) return;
        const transaction = this.db.transaction(['operations'], 'readonly');
        const store = transaction.objectStore('operations');
        const request = store.getAll();

        request.onsuccess = () => {
            this.pendingOperations.set(request.result || []);
        };
    }

    private loadConflicts() {
        if (!this.db) return;
        const transaction = this.db.transaction(['conflicts'], 'readonly');
        const store = transaction.objectStore('conflicts');
        const request = store.getAll();

        request.onsuccess = () => {
            this.syncConflicts.set(request.result || []);
        };
    }

    private saveOperation(op: SyncOperation): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['operations'], 'readwrite');
            const store = transaction.objectStore('operations');
            const request = store.put(op);
            request.onsuccess = () => {
                this.pendingOperations.update(ops => [...ops, op]);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    private deleteOperation(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['operations'], 'readwrite');
            const store = transaction.objectStore('operations');
            const request = store.delete(id);
            request.onsuccess = () => {
                this.pendingOperations.update(ops => ops.filter(o => o.id !== id));
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    private saveConflict(conflict: SyncConflict): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject('DB not initialized');
            const transaction = this.db.transaction(['conflicts'], 'readwrite');
            const store = transaction.objectStore('conflicts');
            const request = store.put(conflict);
            request.onsuccess = () => {
                this.syncConflicts.update(c => [...c, conflict]);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    queueOperation(method: string, url: string, body: any): void {
        if (this.isOnline()) {
            this.http.request(method, url, { body }).subscribe();
            return;
        }

        const op: SyncOperation = {
            id: crypto.randomUUID(),
            method,
            url,
            body,
            timestamp: new Date()
        };

        this.saveOperation(op);
    }

    private async syncData() {
        const ops = this.pendingOperations();
        if (ops.length === 0) return;

        for (const op of ops) {
            try {
                await firstValueFrom(this.http.request(op.method, op.url, { body: op.body }));
                await this.deleteOperation(op.id);
            } catch (e: any) {
                if (e instanceof HttpErrorResponse && e.status === 409) {
                    // Handle Conflict
                    const conflict: SyncConflict = {
                        id: crypto.randomUUID(),
                        operation: op,
                        serverMessage: e.error?.message || 'Data conflict detected',
                        resolved: false
                    };
                    await this.saveConflict(conflict);
                    await this.deleteOperation(op.id); // Remove from pending to avoid blocking
                } else if (e instanceof HttpErrorResponse && e.status >= 500) {
                    // Server error, leave in queue to try again later
                    console.error(`Server error syncing operation ${op.id}`, e);
                } else if (e instanceof HttpErrorResponse && e.status >= 400) {
                    // Client error (e.g. 400, 403), likely won't succeed on retry
                    console.error(`Permanent failure syncing operation ${op.id}`, e);
                    await this.deleteOperation(op.id);
                } else {
                    // Network error, leave in queue
                    console.error(`Network error syncing operation ${op.id}`, e);
                }
            }
        }
    }

    async resolveConflict(conflictId: string, action: 'retry' | 'discard', newBody?: any) {
        const conflict = this.syncConflicts().find(c => c.id === conflictId);
        if (!conflict) return;

        if (action === 'retry') {
            const op = conflict.operation;
            if (newBody) op.body = newBody;
            this.queueOperation(op.method, op.url, op.body);
        }

        // Delete conflict
        if (this.db) {
            const transaction = this.db.transaction(['conflicts'], 'readwrite');
            const store = transaction.objectStore('conflicts');
            store.delete(conflictId);
            this.syncConflicts.update(c => c.filter(x => x.id !== conflictId));
        }
    }
}
