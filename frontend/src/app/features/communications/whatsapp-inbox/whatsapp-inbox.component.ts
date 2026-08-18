import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';
import { CommunicationService, WhatsAppMessage } from '../../../core/infrastructure/communication/communication.service';


@Component({
  selector: 'app-whatsapp-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whatsapp-inbox.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
  `]
})
export class WhatsappInboxComponent implements OnInit {
  private commService = inject(CommunicationService);
  private dialog = inject(DialogService);

  messages = signal<WhatsAppMessage[]>([]);

  contacts = computed(() => {
    const allMsgs = this.messages();
    const grouped = new Map<string, { phone: string; latestMessage: WhatsAppMessage; unreadCount: number }>();

    const sorted = [...allMsgs].sort(
      (a, b) => new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime()
    );

    sorted.forEach(msg => {
      const existing = grouped.get(msg.phone_number);
      grouped.set(msg.phone_number, {
        phone: msg.phone_number,
        latestMessage: msg,
        unreadCount:
          msg.direction === 'INBOUND' && msg.status === 'RECEIVED'
            ? (existing?.unreadCount ?? 0) + 1
            : existing?.unreadCount ?? 0
      });
    });

    return Array.from(grouped.values()).sort(
      (a, b) =>
        new Date(b.latestMessage.created_at ?? '').getTime() -
        new Date(a.latestMessage.created_at ?? '').getTime()
    );
  });

  selectedPhone = signal<string | null>(null);

  selectedConversation = computed(() => {
    const phone = this.selectedPhone();
    if (!phone) return [];
    return this.messages()
      .filter(m => m.phone_number === phone)
      .sort(
        (a, b) =>
          new Date(a.created_at ?? '').getTime() - new Date(b.created_at ?? '').getTime()
      );
  });

  newMessageText = '';
  isSending = signal(false);
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.loadMessages();
    this.pollInterval = setInterval(() => this.loadMessages(), 10000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadMessages() {
    this.commService.getWhatsAppMessages().subscribe({
      next: msgs => this.messages.set(msgs ?? []),
      error: err => console.error('Failed to load WhatsApp messages', err)
    });
  }

  selectContact(phone: string) {
    this.selectedPhone.set(phone);
  }

  sendMessage() {
    const text = this.newMessageText.trim();
    const phone = this.selectedPhone();
    if (!text || !phone || this.isSending()) return;

    this.isSending.set(true);
    this.commService.sendWhatsAppMessage(phone, text).subscribe({
      next: () => {
        this.newMessageText = '';
        this.loadMessages();
        this.isSending.set(false);
      },
      error: () => {
        this.dialog.alert('Failed to send message. Please try again.', 'Send Error', 'error');
        this.isSending.set(false);
      }
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const dayMs = 86400000;
    if (diff < dayMs && now.getDate() === d.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 2 * dayMs) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  get hasConversation(): boolean {
    return this.selectedPhone() !== null;
  }
}
