import { Injectable, inject, signal, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PollOption {
    id: string;
    text: string;
    votes: string[];
}

export interface PollData {
    question: string;
    options: PollOption[];
    is_closed?: boolean;
}

export interface ActionCardData {
    title: string;
    subtitle: string;
    action_type: 'PAY_FEE' | 'VIEW_REPORT' | 'VIEW_HOMEWORK';
    action_payload: string;
    button_text: string;
    icon?: string;
    badge?: string;
}

export interface MeetingData {
    room_name: string;
    meeting_url: string;
    topic: string;
    host_name?: string;
}

export interface ReadReceiptEntry {
    user_id: string;
    user_name: string;
    user_role: string;
    read_at: string;
}

export interface AiAssistantResponse {
    query: string;
    answer: string;
    suggestions: string[];
}

export interface ScheduledMessage {
    id: string;
    conversation_id: string;
    content: string;
    scheduled_for: string;
    message_type?: string;
    poll_data?: string;
    action_card_data?: string;
    created_at: string;
}

export interface ChannelAnalytics {
    conversation_id: string;
    total_messages: number;
    total_participants: number;
    messages_by_type: Record<string, number>;
    top_senders: { sender_id: string; count: number }[];
    activity_by_hour: Record<string, number>;
    generated_at: string;
}

export interface WsEvent {
    type: 'message' | 'typing' | 'read' | 'presence';
    payload: any;
}

export interface ChatContact {
    user_id: string;
    name: string;
    email: string;
    role: string;
    subtitle: string;
    avatar_url?: string;
    is_online?: boolean;
    last_seen?: string;
}

export interface Conversation {
    id: string;
    participant_a: string;
    participant_b: string;
    type?: string; // 'DIRECT' | 'GROUP' | 'CLASS'
    title?: string;
    description?: string;
    avatar_url?: string;
    is_announcement?: boolean;
    other_participant?: ChatContact;
    last_message?: Message;
    unread_count?: number;
    pinned_count?: number;
    updated_at: string;
    created_at?: string;
    messages?: Message[];
    is_typing?: boolean; // local UI state
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    message_type?: 'TEXT' | 'POLL' | 'ACTION_CARD' | 'MEETING';
    content: string;
    parent_id?: string;
    reply_to_message?: Message;
    attachment_url?: string;
    attachment_type?: string; // 'image' | 'pdf' | 'file' | 'audio'
    attachment_name?: string;
    attachment_size?: number;
    poll_data?: string; // JSON string of PollData
    action_card_data?: string; // JSON string of ActionCardData
    meeting_data?: string; // JSON string of MeetingData
    is_pinned?: boolean;
    pinned_by?: string;
    is_flagged?: boolean;
    flag_reason?: string;
    reactions?: string; // JSON string: { emoji: string[] }
    is_read: boolean;
    read_by?: string; // JSON string: ReadReceiptEntry[]
    audio_transcript?: string;
    is_urgent?: boolean;
    fallback_sms?: boolean;
    created_at: string;
    sender?: { id: string; email: string; username?: string };
    pending?: boolean; // local optimistic UI state
    translated_text?: string;
    show_translation?: boolean;
    show_transcript?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessagingService implements OnDestroy {
    private http = inject(HttpClient);
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);
    private api = '/api/messages';

    readonly totalUnreadCount = signal<number>(0);
    readonly isRecording = signal<boolean>(false);

    // Floating Chat Bubble State
    readonly floatingChatOpen = signal<boolean>(false);
    readonly floatingChatMinimized = signal<boolean>(false);
    readonly activeFloatingConversation = signal<Conversation | null>(null);

    // WebSocket
    private ws: WebSocket | null = null;
    private wsToken = '';
    private wsReconnectTimer: any = null;
    private readonly wsEvents$ = new Subject<WsEvent>();
    readonly liveEvents$ = this.wsEvents$.asObservable();

    // Typing indicators: conversationId -> boolean
    private typingSubject = new BehaviorSubject<Record<string, boolean>>({});
    readonly typingMap$ = this.typingSubject.asObservable();

    // Voice recording
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    // ── Floating Chat Bubble Controls ────────────────────────────
    toggleFloatingChat(): void {
        if (!this.floatingChatOpen()) {
            this.floatingChatOpen.set(true);
            this.floatingChatMinimized.set(false);
        } else if (this.floatingChatMinimized()) {
            this.floatingChatMinimized.set(false);
        } else {
            this.floatingChatOpen.set(false);
        }
    }

    openFloatingChat(): void {
        this.floatingChatOpen.set(true);
        this.floatingChatMinimized.set(false);
    }

    minimizeFloatingChat(): void {
        this.floatingChatMinimized.set(true);
    }

    closeFloatingChat(): void {
        this.floatingChatOpen.set(false);
    }

    openDirectChat(recipientIdOrUserId: string, opts?: { preferNavigate?: boolean }): void {
        if (!recipientIdOrUserId) return;
        const cleanId = recipientIdOrUserId.trim();
        if (!cleanId) return;

        if (opts?.preferNavigate) {
            this.router.navigate(['/communications/messages'], { queryParams: { recipientId: cleanId } });
            return;
        }

        // Find or create conversation and open in floating chat
        this.startConversation(cleanId).subscribe({
            next: (conv) => {
                this.activeFloatingConversation.set(conv);
                this.floatingChatOpen.set(true);
                this.floatingChatMinimized.set(false);
            },
            error: () => {
                this.router.navigate(['/communications/messages'], { queryParams: { recipientId: cleanId } });
            }
        });
    }

    // ── WebSocket ────────────────────────────────────────────────
    connectWebSocket(token: string): void {
        if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') return;
        this.wsToken = token;
        // Guard against both OPEN (1) and CONNECTING (0) states
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';

        // Resolve tenant subdomain for the WebSocket connection
        let tenant = '';
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            tenant = parts[0];
            if (tenant === 'www' || tenant === 'localhost' || tenant === '127') {
                tenant = '';
            }
        }
        if (!tenant) {
            try { tenant = localStorage.getItem('schoollinx_tenant_subdomain') || ''; } catch {}
        }

        // Resolve backend host (handles both proxy and direct API URL configs)
        let apiHost = location.host;
        if (environment.apiUrl?.startsWith('http')) {
            try { apiHost = new URL(environment.apiUrl).host; } catch {}
        }

        const wsUrl = `${protocol}://${apiHost}/ws/chat?token=${token}&tenant=${tenant}`;
        try {
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
                console.log('[Chat] WS connected');
            };
            this.ws.onmessage = (e) => {
                try {
                    const data: WsEvent = JSON.parse(e.data);
                    this.wsEvents$.next(data);
                    if (data.type === 'typing') {
                        const cur = this.typingSubject.getValue();
                        cur[data.payload.conversation_id] = data.payload.is_typing;
                        this.typingSubject.next({ ...cur });
                        if (data.payload.is_typing) {
                            setTimeout(() => {
                                const m = this.typingSubject.getValue();
                                m[data.payload.conversation_id] = false;
                                this.typingSubject.next({ ...m });
                            }, 3500);
                        }
                    }
                    if (data.type === 'message') {
                        this.totalUnreadCount.update(n => n + 1);
                    }
                } catch { /**/ }
            };
            this.ws.onclose = () => {
                this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(this.wsToken), 5000);
            };
            this.ws.onerror = () => this.ws?.close();
        } catch (err) {
            console.error('[Chat] WS init error', err);
        }
    }

    sendWsTyping(conversationId: string, isTyping: boolean): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'typing',
                payload: { conversation_id: conversationId, is_typing: isTyping }
            }));
        }
    }

    disconnectWebSocket(): void {
        if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
        this.ws?.close();
        this.ws = null;
    }

    ngOnDestroy(): void { this.disconnectWebSocket(); }

    // ── REST ─────────────────────────────────────────────────────
    getConversations(): Observable<Conversation[]> {
        return this.http.get<Conversation[]>(`${this.api}/conversations`).pipe(
            tap(convs => {
                const total = convs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
                this.totalUnreadCount.set(total);
            })
        );
    }

    getContacts(query?: string, role?: string): Observable<ChatContact[]> {
        let params = new HttpParams();
        if (query) params = params.set('query', query);
        if (role && role !== 'ALL') params = params.set('role', role);
        return this.http.get<ChatContact[]>(`${this.api}/contacts`, { params });
    }

    startConversation(recipientId: string): Observable<Conversation> {
        return this.http.post<Conversation>(`${this.api}/conversations`, { recipient_id: recipientId });
    }

    createGroupChannel(title: string, description: string, type = 'GROUP', isAnnouncement = false): Observable<Conversation> {
        return this.http.post<Conversation>(`${this.api}/channels`, {
            title, description, type, is_announcement: isAnnouncement
        });
    }

    getMessages(conversationId: string): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.api}/conversations/${conversationId}`);
    }

    sendMessage(
        conversationId: string, 
        content: string, 
        parentId?: string,
        attachment?: { url: string; type: string; name: string; size?: number },
        options?: { 
            message_type?: 'TEXT' | 'POLL' | 'ACTION_CARD' | 'MEETING';
            poll_data?: string;
            action_card_data?: string;
            meeting_data?: string;
            is_pinned?: boolean; 
            is_urgent?: boolean; 
            fallback_sms?: boolean; 
            audio_transcript?: string; 
        }
    ): Observable<Message> {
        const payload: any = {
            content,
            parent_id: parentId,
            ...options
        };
        if (attachment) {
            payload.attachment_url = attachment.url;
            payload.attachment_type = attachment.type;
            payload.attachment_name = attachment.name;
            payload.attachment_size = attachment.size;
        }
        return this.http.post<Message>(`${this.api}/conversations/${conversationId}/send`, payload);
    }

    votePoll(messageId: string, optionId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.api}/messages/${messageId}/vote`, { option_id: optionId });
    }

    getChannelMembers(conversationId: string): Observable<ChatContact[]> {
        return this.http.get<ChatContact[]>(`${this.api}/conversations/${conversationId}/members`);
    }

    getChannelMedia(conversationId: string): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.api}/conversations/${conversationId}/media`);
    }

    togglePin(conversationId: string, messageId: string): Observable<{ is_pinned: boolean }> {
        return this.http.post<{ is_pinned: boolean }>(`${this.api}/conversations/${conversationId}/pin`, { message_id: messageId });
    }

    getReadReceipts(messageId: string): Observable<ReadReceiptEntry[]> {
        return this.http.get<ReadReceiptEntry[]>(`${this.api}/messages/${messageId}/receipts`);
    }

    summarizeChannel(conversationId: string): Observable<{ summary: string }> {
        return this.http.post<{ summary: string }>(`${this.api}/ai-summarize`, { conversation_id: conversationId });
    }

    translateMessage(text: string, targetLang: string): Observable<{ translated_text: string; target_lang: string }> {
        return this.http.post<{ translated_text: string; target_lang: string }>(`${this.api}/ai-translate`, { text, target_lang: targetLang });
    }

    downloadExport(conversationId: string): void {
        window.open(`${this.api}/conversations/${conversationId}/export`, '_blank');
    }

    // ── Scheduled Messages ────────────────────────────────────────
    scheduleMessage(
        conversationId: string,
        content: string,
        scheduledFor: string,
        options?: { message_type?: string; poll_data?: string; action_card_data?: string }
    ): Observable<ScheduledMessage> {
        return this.http.post<ScheduledMessage>(`${this.api}/conversations/${conversationId}/schedule`, {
            content,
            scheduled_for: scheduledFor,
            ...options
        });
    }

    getScheduledMessages(conversationId: string): Observable<ScheduledMessage[]> {
        return this.http.get<ScheduledMessage[]>(`${this.api}/conversations/${conversationId}/scheduled`);
    }

    cancelScheduledMessage(scheduledMessageId: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.api}/scheduled/${scheduledMessageId}`);
    }

    // ── Channel Analytics ─────────────────────────────────────────
    getChannelAnalytics(conversationId: string): Observable<ChannelAnalytics> {
        return this.http.get<ChannelAnalytics>(`${this.api}/conversations/${conversationId}/analytics`);
    }

    // ── Bot Triggers ─────────────────────────────────────────────
    triggerAttendanceDigest(conversationId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.api}/conversations/${conversationId}/bot/attendance-summary`, {});
    }

    triggerFeeReminder(conversationId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.api}/conversations/${conversationId}/bot/fee-reminder`, {});
    }

    triggerExamCountdown(conversationId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.api}/conversations/${conversationId}/bot/exam-countdown`, {});
    }

    uploadAttachment(file: File | Blob, fileName = 'attachment'): Observable<{ url: string; name: string; type: string; size: number }> {
        const formData = new FormData();
        if (file instanceof File) {
            formData.append('file', file, file.name);
        } else {
            formData.append('file', file, fileName);
        }
        return this.http.post<{ url: string; name: string; type: string; size: number }>(`${this.api}/upload`, formData);
    }

    flagMessage(messageId: string, reason: string): Observable<any> {
        return this.http.post(`${this.api}/flag`, { message_id: messageId, reason });
    }

    addReaction(messageId: string, emoji: string, userName: string): Observable<any> {
        return this.http.post(`${this.api}/react`, { message_id: messageId, emoji, user_name: userName });
    }

    markAsRead(conversationId: string): Observable<any> {
        return this.http.put(`${this.api}/conversations/${conversationId}/read`, {}).pipe(
            tap(() => { this.getConversations().subscribe(); })
        );
    }

    askAiAssistant(query: string): Observable<AiAssistantResponse> {
        return this.http.post<AiAssistantResponse>(`${this.api}/ai-assistant`, { query });
    }

    isQuietHours(): boolean {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday, 6 is Saturday
        const hour = now.getHours();
        // Weekend or outside 8 AM - 5:30 PM
        if (day === 0 || day === 6) return true;
        if (hour < 8 || hour >= 17) return true;
        return false;
    }

    // ── Voice Notes ──────────────────────────────────────────────
    async startVoiceRecording(): Promise<void> {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.audioChunks.push(e.data); };
        this.mediaRecorder.start(200);
        this.isRecording.set(true);
    }

    stopVoiceRecording(): Promise<File> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) { reject('No recorder'); return; }
            this.mediaRecorder.onstop = () => {
                const ext = this.mediaRecorder?.mimeType.includes('webm') ? 'webm' : 'ogg';
                const blob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType });
                const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: blob.type });
                this.audioChunks = [];
                this.isRecording.set(false);
                this.mediaRecorder?.stream?.getTracks().forEach(t => t.stop());
                resolve(file);
            };
            this.mediaRecorder.stop();
        });
    }

    cancelVoiceRecording(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stream?.getTracks().forEach(t => t.stop());
            this.mediaRecorder.stop();
        }
        this.audioChunks = [];
        this.isRecording.set(false);
    }

    // ── Helpers ──────────────────────────────────────────────────
    parsePollData(raw?: string): PollData | null {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    parseActionCardData(raw?: string): ActionCardData | null {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    parseMeetingData(raw?: string): MeetingData | null {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    }

    parseReactions(raw?: string): Record<string, string[]> {
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }

    formatFileSize(bytes?: number): string {
        if (!bytes || bytes === 0) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }
}


