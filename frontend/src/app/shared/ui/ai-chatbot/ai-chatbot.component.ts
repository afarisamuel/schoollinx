import { Component, OnInit, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatbotService, ChatMessage } from './chatbot.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
    selector: 'app-ai-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DecimalPipe],
    templateUrl: './ai-chatbot.component.html',
    styleUrl: './ai-chatbot.component.css',
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
    @ViewChild('messageContainer') private messageContainer!: ElementRef;

    private chatbot = inject(ChatbotService);
    private auth = inject(AuthService);

    isAdmin = () => this.auth.currentUserValue?.role === 'ADMIN';

    isOpen = signal(false);
    isTyping = signal(false);
    userInput = signal('');
    messages = signal<ChatMessage[]>([]);

    ngOnInit() {
        this.messages.set([this.chatbot.getGreeting()]);
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    toggle() {
        this.isOpen.set(!this.isOpen());
    }

    close() {
        this.isOpen.set(false);
    }

    sendMessage() {
        const text = this.userInput().trim();
        if (!text) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: new Date(),
            type: 'text',
        };

        this.messages.update(msgs => [...msgs, userMsg]);
        this.userInput.set('');
        this.isTyping.set(true);

        // Simulate a natural delay
        setTimeout(() => {
            this.chatbot.processMessage(text).subscribe(response => {
                this.messages.update(msgs => [...msgs, response]);
                this.isTyping.set(false);
            });
        }, 700);
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    sendQuickPrompt(prompt: string) {
        this.userInput.set(prompt);
        this.sendMessage();
    }

    private scrollToBottom() {
        try {
            if (this.messageContainer) {
                this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
            }
        } catch (_) {}
    }

    formatContent(content: string): string {
        // Convert markdown-ish bold (**text**) and newlines to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    getRiskColor(risk: string): string {
        if (risk === 'High') return 'text-rose-400';
        if (risk === 'Medium') return 'text-amber-400';
        return 'text-emerald-400';
    }
}
