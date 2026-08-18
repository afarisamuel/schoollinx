import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IdbService {
    private dbName = 'SchoolLinxEduDB';
    private storeName = 'offline_grades';
    private dbVersion = 1;

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = () => reject('IndexedDB error');
            request.onsuccess = (e: any) => resolve(e.target.result);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    async saveOfflineGrades(classId: string, grades: any[]): Promise<void> {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.put({ id: `class_${classId}`, classId, grades, timestamp: new Date().toISOString() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject('Save failed');
        });
    }

    async getPendingGrades(): Promise<any[]> {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Fetch failed');
        });
    }

    async clearPendingGrades(classId: string): Promise<void> {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            store.delete(`class_${classId}`);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject('Clear failed');
        });
    }
}
