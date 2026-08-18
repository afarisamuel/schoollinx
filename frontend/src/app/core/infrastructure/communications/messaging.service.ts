import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Conversation {
    id: string;
    participant_a: string;
    participant_b: string;
    updated_at: string;
    messages?: Message[];
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    parent_id?: string;
    is_read: boolean;
    created_at: string;
    sender?: { id: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class MessagingService {
    private http = inject(HttpClient);
    private api = '/api/messages';

    getConversations(): Observable<Conversation[]> {
        return this.http.get<Conversation[]>(`${this.api}/conversations`);
    }

    startConversation(recipientId: string): Observable<Conversation> {
        return this.http.post<Conversation>(`${this.api}/conversations`, { recipient_id: recipientId });
    }

    getMessages(conversationId: string): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.api}/conversations/${conversationId}`);
    }

    sendMessage(conversationId: string, content: string, parentId?: string): Observable<Message> {
        return this.http.post<Message>(`${this.api}/conversations/${conversationId}/send`, { content, parent_id: parentId });
    }

    markAsRead(conversationId: string): Observable<any> {
        return this.http.put(`${this.api}/conversations/${conversationId}/read`, {});
    }
}
