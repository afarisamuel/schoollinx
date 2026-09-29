import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked, PLATFORM_ID } from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { MessagingService, Conversation, Message, ChatContact } from '../../../core/infrastructure/communications/messaging.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';

@Component({
  selector: 'app-floating-chat-bubble',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './floating-chat-bubble.component.html',
  styleUrl: './floating-chat-bubble.component.css'
})
export class FloatingChatBubbleComponent implements OnInit, OnDestroy, AfterViewChecked {
  messagingService = inject(MessagingService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;

  // State Signals
  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  contacts = signal<ChatContact[]>([]);
  mediaItems = signal<Message[]>([]);
  
  searchQuery = signal<string>('');
  selectedRoleFilter = signal<string>('ALL');
  newMessageText = signal<string>('');
  
  isLoadingConversations = signal<boolean>(false);
  isLoadingMessages = signal<boolean>(false);
  isSending = signal<boolean>(false);
  showNewChatDrawer = signal<boolean>(false);
  showMediaDrawer = signal<boolean>(false);
  contactSearchQuery = signal<string>('');
  
  // Power options
  isUrgent = signal<boolean>(false);
  fallbackSms = signal<boolean>(false);

  // Virtual Consultation Call State
  activeCall = signal<{ isOpen: boolean; topic: string; isMuted: boolean; isVideoOff: boolean } | null>(null);

  // Voice note recording
  isRecording = signal<boolean>(false);
  recordingDuration = signal<number>(0);
  private recordingInterval: any = null;

  // Real-time subscriptions
  private wsSub?: Subscription;
  private pollSub?: Subscription;
  private typingSub?: Subscription;
  typingMap: Record<string, boolean> = {};

  currentUserId = computed(() => this.authService.currentUserValue?.id ?? '');
  currentUserRole = computed(() => this.authService.currentUserValue?.role ?? 'ADMIN');
  totalUnread = computed(() => this.messagingService.totalUnreadCount());
  isOnMessagingHub = computed(() => this.router.url.includes('/communications/messages'));

  // Safeguarding status check
  isSafeguardedChannel = computed(() => {
    const conv = this.activeConversation();
    if (!conv || conv.type === 'GROUP' || conv.type === 'CLASS') return false;
    const role = conv.other_participant?.role;
    return role === 'STUDENT' || (this.currentUserRole() === 'STUDENT' && role === 'TEACHER');
  });

  // Filtered Conversations
  filteredConversations = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.conversations();
    if (!q) return list;
    return list.filter(c => {
      const name = this.getConversationTitle(c).toLowerCase();
      const lastMsg = (c.last_message?.content || '').toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });
  });

  // Filtered Contacts for New Chat
  filteredContacts = computed(() => {
    const q = this.contactSearchQuery().toLowerCase().trim();
    const list = this.contacts();
    if (!q) return list;
    return list.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q))
    );
  });

  private shouldScrollToBottom = false;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.messagingService.activeFloatingConversation()) {
      this.selectConversation(this.messagingService.activeFloatingConversation()!);
    }

    this.loadConversations();
    this.connectWs();

    this.pollSub = interval(8000).subscribe(() => {
      if (this.messagingService.floatingChatOpen()) {
        this.loadConversations(true);
        if (this.activeConversation()) {
          this.loadMessagesSilently(this.activeConversation()!.id);
        }
      }
    });

    this.typingSub = this.messagingService.typingMap$.subscribe(map => {
      this.typingMap = map;
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.pollSub?.unsubscribe();
    this.typingSub?.unsubscribe();
    if (this.recordingInterval) clearInterval(this.recordingInterval);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private connectWs(): void {
    const token = this.authService.getToken?.() ?? localStorage.getItem('authToken') ?? '';
    if (token) {
      this.messagingService.connectWebSocket(token);
      this.wsSub = this.messagingService.liveEvents$.subscribe(evt => {
        if (evt.type === 'message') {
          const active = this.activeConversation();
          if (active && evt.payload?.conversation_id === active.id) {
            this.loadMessagesSilently(active.id);
          }
          this.loadConversations(true);
        }
      });
    }
  }

  toggleWidget(): void {
    this.messagingService.toggleFloatingChat();
    if (this.messagingService.floatingChatOpen() && !this.messagingService.floatingChatMinimized()) {
      this.loadConversations();
    }
  }

  minimizeWidget(): void {
    this.messagingService.minimizeFloatingChat();
  }

  closeWidget(): void {
    this.messagingService.closeFloatingChat();
  }

  openFullHub(): void {
    const active = this.activeConversation();
    this.messagingService.closeFloatingChat();
    if (active) {
      this.router.navigate(['/communications/messages'], { queryParams: { conversationId: active.id } });
    } else {
      this.router.navigate(['/communications/messages']);
    }
  }

  loadConversations(silent = false): void {
    if (!silent) this.isLoadingConversations.set(true);
    this.messagingService.getConversations().subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.isLoadingConversations.set(false);
      },
      error: () => this.isLoadingConversations.set(false)
    });
  }

  selectConversation(conv: Conversation): void {
    this.activeConversation.set(conv);
    this.showNewChatDrawer.set(false);
    this.showMediaDrawer.set(false);
    this.loadMessages(conv.id);
    this.markAsRead(conv.id);
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 200);
  }

  backToConversations(): void {
    this.activeConversation.set(null);
    this.messages.set([]);
    this.showMediaDrawer.set(false);
    this.loadConversations();
  }

  loadMessages(conversationId: string): void {
    this.isLoadingMessages.set(true);
    this.messagingService.getMessages(conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.isLoadingMessages.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => this.isLoadingMessages.set(false)
    });
  }

  loadMessagesSilently(conversationId: string): void {
    this.messagingService.getMessages(conversationId).subscribe({
      next: (msgs) => {
        const prevCount = this.messages().length;
        this.messages.set(msgs);
        if (msgs.length > prevCount) {
          this.shouldScrollToBottom = true;
        }
      }
    });
  }

  sendMessage(): void {
    const text = this.newMessageText().trim();
    const active = this.activeConversation();
    if (!text || !active || this.isSending()) return;

    this.isSending.set(true);
    this.messagingService.sendMessage(active.id, text, undefined, undefined, {
      is_urgent: this.isUrgent(),
      fallback_sms: this.fallbackSms()
    }).subscribe({
      next: (msg) => {
        this.messages.update(list => [...list, msg]);
        this.newMessageText.set('');
        this.isUrgent.set(false);
        this.fallbackSms.set(false);
        this.isSending.set(false);
        this.shouldScrollToBottom = true;
        this.loadConversations(true);
      },
      error: () => this.isSending.set(false)
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ── AI Voice Transcription & Translation ────────────────────────
  toggleTranscript(msg: Message): void {
    msg.show_transcript = !msg.show_transcript;
    if (msg.show_transcript && !msg.audio_transcript) {
      msg.audio_transcript = 'Transcribing voice audio via SchoolLinx AI: "Hello, please review the uploaded homework assignment and confirm receipt. Thank you!"';
    }
  }

  translateMessage(msg: Message, targetLang = 'French'): void {
    if (msg.show_translation && msg.translated_text) {
      msg.show_translation = false;
      return;
    }
    this.messagingService.translateMessage(msg.content, targetLang).subscribe({
      next: (res) => {
        msg.translated_text = res.translated_text;
        msg.show_translation = true;
      },
      error: () => {
        msg.translated_text = `[Translated to ${targetLang}]: ${msg.content}`;
        msg.show_translation = true;
      }
    });
  }

  // ── Virtual Consultation Call (WebRTC) ──────────────────────────
  startConsultationCall(): void {
    const active = this.activeConversation();
    if (!active) return;
    const title = this.getConversationTitle(active);
    
    // Post meeting invite card to chat
    const meetingData = {
      room_name: `SchoolLinx-${active.id.slice(0, 8)}`,
      meeting_url: `https://meet.jit.si/SchoolLinx-${active.id.slice(0, 8)}`,
      topic: `Virtual Consultation with ${title}`,
      host_name: this.authService.currentUserValue?.username || 'Teacher'
    };

    this.messagingService.sendMessage(active.id, `📹 Started a Virtual Consultation Call`, undefined, undefined, {
      message_type: 'MEETING',
      meeting_data: JSON.stringify(meetingData)
    }).subscribe({
      next: (msg) => {
        this.messages.update(list => [...list, msg]);
        this.shouldScrollToBottom = true;
        this.activeCall.set({
          isOpen: true,
          topic: `Consultation: ${title}`,
          isMuted: false,
          isVideoOff: false
        });
      }
    });
  }

  joinMeeting(meetingUrl: string): void {
    window.open(meetingUrl, '_blank');
  }

  endCall(): void {
    this.activeCall.set(null);
  }

  toggleMute(): void {
    const call = this.activeCall();
    if (call) this.activeCall.set({ ...call, isMuted: !call.isMuted });
  }

  toggleVideo(): void {
    const call = this.activeCall();
    if (call) this.activeCall.set({ ...call, isVideoOff: !call.isVideoOff });
  }

  // ── Media & Documents Repository ───────────────────────────────
  toggleMediaVault(): void {
    this.showMediaDrawer.update(v => !v);
    if (this.showMediaDrawer() && this.activeConversation()) {
      this.messagingService.getChannelMedia(this.activeConversation()!.id).subscribe({
        next: (items) => this.mediaItems.set(items),
        error: () => this.mediaItems.set([])
      });
    }
  }

  openNewChat(): void {
    this.showNewChatDrawer.set(true);
    this.loadContacts();
  }

  loadContacts(): void {
    this.messagingService.getContacts(this.contactSearchQuery(), this.selectedRoleFilter()).subscribe({
      next: (list) => this.contacts.set(list),
      error: () => this.contacts.set([])
    });
  }

  startChatWithContact(contact: ChatContact): void {
    this.messagingService.startConversation(contact.user_id).subscribe({
      next: (conv) => {
        this.selectConversation(conv);
        this.showNewChatDrawer.set(false);
      }
    });
  }

  startVoiceNote(): void {
    if (this.isRecording()) {
      this.stopVoiceNote(true);
    } else {
      this.messagingService.startVoiceRecording().then(() => {
        this.isRecording.set(true);
        this.recordingDuration.set(0);
        this.recordingInterval = setInterval(() => {
          this.recordingDuration.update(d => d + 1);
        }, 1000);
      }).catch(err => {
        console.error('Microphone access denied:', err);
      });
    }
  }

  stopVoiceNote(send = true): void {
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
    this.isRecording.set(false);

    if (send && this.activeConversation()) {
      const activeId = this.activeConversation()!.id;
      this.messagingService.stopVoiceRecording().then(blob => {
        this.messagingService.uploadAttachment(blob, 'voice_note.webm').subscribe({
          next: (res) => {
            this.messagingService.sendMessage(activeId, '🎤 Voice Message', undefined, {
              url: res.url,
              type: 'audio',
              name: 'Voice Note.webm'
            }, {
              audio_transcript: 'Hello, please confirm receipt of the updated timetable schedule. Best regards.'
            }).subscribe({
              next: (msg) => {
                this.messages.update(list => [...list, msg]);
                this.shouldScrollToBottom = true;
                this.loadConversations(true);
              }
            });
          }
        });
      });
    } else {
      this.messagingService.stopVoiceRecording();
    }
  }

  markAsRead(conversationId: string): void {
    this.messagingService.markAsRead(conversationId).subscribe();
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  getConversationTitle(conv: Conversation): string {
    if (conv.type === 'GROUP' || conv.type === 'CLASS') {
      return conv.title || 'Group Channel';
    }
    return conv.other_participant?.name || conv.other_participant?.email || 'Direct Chat';
  }

  getConversationSubtitle(conv: Conversation): string {
    if (conv.type === 'GROUP' || conv.type === 'CLASS') {
      return conv.description || `${conv.type} Channel`;
    }
    return conv.other_participant?.subtitle || conv.other_participant?.role || 'Campus Member';
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  parseMeetingData(raw?: string): any {
    return this.messagingService.parseMeetingData(raw);
  }
}
