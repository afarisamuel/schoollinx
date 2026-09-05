import { Component, inject, signal, OnInit, computed, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagingService, Conversation, Message } from '../../../core/infrastructure/communications/messaging.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-messaging-hub',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './messaging-hub.component.html',
    styleUrl: './messaging-hub.component.css'
})
export class MessagingHubComponent implements OnInit, AfterViewChecked {
    @ViewChild('messagesList') private messagesList!: ElementRef;

    private msgService = inject(MessagingService);
    private authService = inject(AuthService);

    conversations = signal<Conversation[]>([]);
    activeConversation = signal<Conversation | null>(null);
    messages = signal<Message[]>([]);
    newMessage = signal('');
    replyingTo = signal<Message | null>(null);
    isLoading = signal(false);
    newRecipientId = signal('');
    showNewConv = signal(false);
    searchQuery = signal('');

    quickReplies = [
        'Thank you for reaching out. We are looking into this.',
        'The attendance records have been verified.',
        'Please check the student grade report in the portal.',
        'We have scheduled a meeting regarding this matter.',
        'Fee receipt has been generated and dispatched.'
    ];

    currentUserId = computed(() => this.authService.currentUserValue?.id ?? '');

    filteredConversations = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return this.conversations();

        return this.conversations().filter(conv => {
            const participant = this.getOtherParticipant(conv).toLowerCase();
            const id = conv.id.toLowerCase();
            return participant.includes(query) || id.includes(query);
        });
    });

    ngOnInit() {
        this.loadConversations();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    private scrollToBottom() {
        try {
            if (this.messagesList) {
                this.messagesList.nativeElement.scrollTop = this.messagesList.nativeElement.scrollHeight;
            }
        } catch {}
    }

    loadConversations() {
        this.msgService.getConversations().subscribe(convs => this.conversations.set(convs));
    }

    selectConversation(conv: Conversation) {
        this.activeConversation.set(conv);
        this.isLoading.set(true);
        this.msgService.getMessages(conv.id).subscribe(msgs => {
            this.messages.set(msgs);
            this.isLoading.set(false);
            this.msgService.markAsRead(conv.id).subscribe();
        });
    }

    isSentByMe(msg: Message): boolean {
        return msg.sender_id === this.currentUserId();
    }

    getOtherParticipant(conv: Conversation): string {
        const me = this.currentUserId();
        return conv.participant_a === me ? conv.participant_b : conv.participant_a;
    }

    send() {
        const conv = this.activeConversation();
        const content = this.newMessage().trim();
        if (!conv || !content) return;

        const parentId = this.replyingTo()?.id;

        this.msgService.sendMessage(conv.id, content, parentId).subscribe(msg => {
            this.messages.update(msgs => [...msgs, msg]);
            this.newMessage.set('');
            this.replyingTo.set(null);
            setTimeout(() => this.scrollToBottom(), 100);
        });
    }

    setReplyTo(msg: Message) {
        this.replyingTo.set(msg);
    }

    cancelReply() {
        this.replyingTo.set(null);
    }

    getParentMessage(parentId: string): Message | undefined {
        return this.messages().find(m => m.id === parentId);
    }

    startNewConversation() {
        const recipientId = this.newRecipientId().trim();
        if (!recipientId) return;

        this.msgService.startConversation(recipientId).subscribe(conv => {
            this.loadConversations();
            this.selectConversation(conv);
            this.newRecipientId.set('');
            this.showNewConv.set(false);
        });
    }

    getInitial(id: string): string {
        return id ? id.charAt(0).toUpperCase() : '?';
    }

    useQuickReply(text: string) {
        this.newMessage.set(text);
    }

    formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}
