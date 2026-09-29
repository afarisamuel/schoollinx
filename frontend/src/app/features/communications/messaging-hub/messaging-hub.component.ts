import { Component, inject, signal, OnInit, OnDestroy, computed, AfterViewChecked, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MessagingService, Conversation, Message, ChatContact, AiAssistantResponse, ScheduledMessage, ChannelAnalytics } from '../../../core/infrastructure/communications/messaging.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { Role } from '../../../core/domain/user.model';

export interface PendingAttachment {
    file: File;
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
    isUploading?: boolean;
}

@Component({
    selector: 'app-messaging-hub',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './messaging-hub.component.html',
    styleUrl: './messaging-hub.component.css'
})
export class MessagingHubComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesList') private messagesList!: ElementRef;
    @ViewChild('fileInput') private fileInput!: ElementRef;

    private msgService = inject(MessagingService);
    private authService = inject(AuthService);
    private route = inject(ActivatedRoute);

    conversations = signal<Conversation[]>([]);
    activeConversation = signal<Conversation | null>(null);
    messages = signal<Message[]>([]);
    newMessage = signal('');
    replyingTo = signal<Message | null>(null);
    isLoading = signal(false);
    isSending = signal(false);
    searchQuery = signal('');
    activeTabFilter = signal<'ALL' | 'DIRECT' | 'CHANNELS'>('ALL');

    // Attachment State
    pendingAttachment = signal<PendingAttachment | null>(null);
    isUploadingAttachment = signal(false);
    previewImageModal = signal<string | null>(null);
    previewDocModal = signal<{ url: string; name: string; type: string } | null>(null);

    // Group / Channel Creation State
    showCreateChannelModal = signal(false);
    newChannelTitle = signal('');
    newChannelDescription = signal('');
    newChannelType = signal<'GROUP' | 'CLASS'>('GROUP');
    isCreatingChannel = signal(false);

    // Safeguarding & Reporting State
    showReportModal = signal(false);
    reportingMessage = signal<Message | null>(null);
    reportReason = signal('Inappropriate communication');
    reportDetails = signal('');
    isSubmittingReport = signal(false);
    reportSuccessMessage = signal('');

    // Granular Read Receipts Modal
    showReadReceiptsModal = signal(false);
    readReceiptsList = signal<any[]>([]);
    inspectingMessage = signal<Message | null>(null);
    isLoadingReceipts = signal(false);

    // AI Catch-Up Channel Summarizer
    showSummarizerModal = signal(false);
    channelSummary = signal<string>('');
    isSummarizing = signal(false);

    // Translation State
    availableLanguages = ['French', 'Spanish', 'Twi', 'Arabic', 'Yoruba', 'Swahili', 'German'];
    selectedTranslateLang = signal('French');
    isTranslating = signal<Record<string, boolean>>({});

    // Urgent broadcast & SMS fallback options
    isUrgentMessage = signal(false);
    fallbackSMS = signal(false);
    isQuietHoursActive = computed(() => this.msgService.isQuietHours());

    // Directory & Contact Picker
    showNewConv = signal(false);
    contactSearchQuery = signal('');
    selectedRoleFilter = signal<string>('ALL');
    contacts = signal<ChatContact[]>([]);
    isLoadingContacts = signal(false);
    manualRecipientId = signal('');
    showManualIdInput = signal(false);

    // AI FAQ / Quick Answers
    showAiAssistant = signal(false);
    aiQuery = signal('');
    aiResponse = signal<AiAssistantResponse | null>(null);
    isAiThinking = signal(false);
    isTypingSimulated = signal(false);

    // Announcement mode & channel settings
    newChannelIsAnnouncement = signal(false);

    // Voice recording
    isVoiceRecording = computed(() => this.msgService.isRecording());
    voiceRecordDuration = signal(0);
    private voiceDurationTimer: any = null;

    // In-Chat Message Search
    chatSearchQuery = signal('');
    showChatSearch = signal(false);

    // Interactive Poll Creation State
    showPollModal = signal(false);
    pollQuestion = signal('');
    pollOption1 = signal('');
    pollOption2 = signal('');
    pollOption3 = signal('');
    pollOption4 = signal('');

    // Video Meeting Launcher State
    showMeetingModal = signal(false);
    meetingTopic = signal('');

    // Interactive Action Card State (Fees, Report Cards, Homework)
    showActionCardModal = signal(false);
    cardTitle = signal('');
    cardSubtitle = signal('');
    cardType = signal<'PAY_FEE' | 'VIEW_REPORT' | 'VIEW_HOMEWORK'>('PAY_FEE');
    cardPayload = signal('');

    // Media & Document Vault Drawer
    showMediaVault = signal(false);
    channelMediaList = signal<Message[]>([]);
    isLoadingMedia = signal(false);

    // Channel Members Roster Drawer
    showMembersDrawer = signal(false);
    channelMembersList = signal<ChatContact[]>([]);
    isLoadingMembers = signal(false);

    // WebSocket subscription & Typing state
    private wsSub?: Subscription;
    private typingSub?: Subscription;
    typingMap: Record<string, boolean> = {};
    private typingDebounce: any = null;

    private pollTimer: any = null;
    private shouldScrollToBottom = false;

    // ── Message Scheduler ────────────────────────────────────────
    showSchedulerModal = signal(false);
    scheduledContent = signal('');
    scheduledFor = signal('');          // ISO datetime-local string
    isScheduling = signal(false);
    scheduleSuccess = signal('');

    // Scheduled Messages Drawer
    showScheduledDrawer = signal(false);
    scheduledMessages = signal<ScheduledMessage[]>([]);
    isLoadingScheduled = signal(false);
    cancellingScheduledId = signal<string | null>(null);

    // ── Channel Analytics Panel ──────────────────────────────────
    showAnalyticsPanel = signal(false);
    channelAnalytics = signal<ChannelAnalytics | null>(null);
    isLoadingAnalytics = signal(false);

    // ── Bot Alerts ───────────────────────────────────────────────
    showBotMenu = signal(false);
    isTriggeringBot = signal(false);
    botSuccessMessage = signal('');

    quickReplies = [
        'Thank you for reaching out. We are looking into this.',
        'The attendance records have been verified.',
        'Please check the academic reports in the portal.',
        'We have scheduled a meeting regarding this matter.',
        'All necessary documents have been updated.'
    ];

    aiSuggestedFaqs = [
        { title: 'Fee Schedules & Deadlines', text: 'School fees for the current term are due by the 15th of next month. You can review invoices directly under Finance & Fees.' },
        { title: 'Midterm Break Dates', text: 'The upcoming midterm break begins next Friday and runs through Tuesday. Normal class schedules resume Wednesday.' },
        { title: 'Exam Guidelines', text: 'Final assessments begin on the 10th. Students must have their biometric ID cards and arrive 15 minutes before the bell.' },
        { title: 'Absence Policy', text: 'To log student absence, please submit a request via the Leave & Absence tab in the Parent Portal.' }
    ];

    currentUser = computed(() => this.authService.currentUserValue);
    currentUserId = computed(() => this.currentUser()?.id ?? '');
    currentUserRole = computed(() => this.currentUser()?.role ?? Role.STUDENT);

    roleFilterTabs = [
        { label: 'All Contacts', value: 'ALL', icon: 'fa-users' },
        { label: 'Teachers & Faculty', value: 'TEACHER', icon: 'fa-chalkboard-user' },
        { label: 'Parents & Guardians', value: 'GUARDIAN', icon: 'fa-user-group' },
        { label: 'Students', value: 'STUDENT', icon: 'fa-graduation-cap' },
        { label: 'School Admin', value: 'ADMIN', icon: 'fa-shield-halved' }
    ];

    filteredConversations = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const tab = this.activeTabFilter();
        let convs = this.conversations();

        if (tab === 'DIRECT') {
            convs = convs.filter(c => !c.type || c.type === 'DIRECT');
        } else if (tab === 'CHANNELS') {
            convs = convs.filter(c => c.type === 'GROUP' || c.type === 'CLASS');
        }

        if (!query) return convs;

        return convs.filter(conv => {
            const name = (this.getOtherParticipantName(conv)).toLowerCase();
            const subtitle = (this.getOtherParticipantSubtitle(conv)).toLowerCase();
            const email = (conv.other_participant?.email || '').toLowerCase();
            const id = conv.id.toLowerCase();
            const lastMsg = (conv.last_message?.content || '').toLowerCase();
            return name.includes(query) || subtitle.includes(query) || email.includes(query) || id.includes(query) || lastMsg.includes(query);
        });
    });

    ngOnInit() {
        this.loadConversations();

        // Query param to open specific conversation
        this.route.queryParams.subscribe(params => {
            if (params['recipientId']) {
                this.startConversationWithId(params['recipientId']);
            }
        });

        // Connect WebSocket for live updates
        const token = this.authService.getToken?.() ?? localStorage.getItem('authToken') ?? '';
        if (token) {
            this.msgService.connectWebSocket(token);
            this.wsSub = this.msgService.liveEvents$.subscribe(evt => {
                if (evt.type === 'message') {
                    const active = this.activeConversation();
                    if (active && evt.payload?.conversation_id === active.id) {
                        this.refreshActiveThreadSilently();
                    }
                    this.loadConversations();
                }
            });
        }

        // Subscribe to typing indicators
        this.typingSub = this.msgService.typingMap$.subscribe(map => {
            this.typingMap = map;
        });

        // Polling fallback for live chat updates every 5 seconds
        this.pollTimer = setInterval(() => {
            this.refreshActiveThreadSilently();
        }, 5000);
    }

    ngOnDestroy() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        if (this.wsSub) this.wsSub.unsubscribe();
        if (this.typingSub) this.typingSub.unsubscribe();
        if (this.voiceDurationTimer) clearInterval(this.voiceDurationTimer);
        this.msgService.disconnectWebSocket();
    }

    ngAfterViewChecked() {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    private scrollToBottom() {
        try {
            if (this.messagesList) {
                this.messagesList.nativeElement.scrollTop = this.messagesList.nativeElement.scrollHeight;
            }
        } catch {}
    }

    loadConversations() {
        this.msgService.getConversations().subscribe({
            next: (convs) => {
                this.conversations.set(convs);
                const currentActive = this.activeConversation();
                if (currentActive) {
                    const updated = convs.find(c => c.id === currentActive.id);
                    if (updated) {
                        this.activeConversation.set(updated);
                    }
                }
            },
            error: () => {}
        });
    }

    selectConversation(conv: Conversation) {
        this.activeConversation.set(conv);
        this.isLoading.set(true);
        this.shouldScrollToBottom = true;

        this.msgService.getMessages(conv.id).subscribe({
            next: (msgs) => {
                this.messages.set(msgs);
                this.isLoading.set(false);
                this.shouldScrollToBottom = true;
                if (conv.unread_count && conv.unread_count > 0) {
                    this.msgService.markAsRead(conv.id).subscribe(() => {
                        this.loadConversations();
                    });
                }
                // Broadcast presence via WS
                this.msgService.sendWsTyping(conv.id, false);
            },
            error: () => { this.isLoading.set(false); }
        });
    }

    private refreshActiveThreadSilently() {
        const active = this.activeConversation();
        if (!active) {
            this.msgService.getConversations().subscribe({
                next: (convs) => this.conversations.set(convs),
                error: () => {}
            });
            return;
        }

        this.msgService.getMessages(active.id).subscribe({
            next: (newMsgs) => {
                const currentCount = this.messages().length;
                if (newMsgs.length !== currentCount) {
                    this.messages.set(newMsgs);
                    this.shouldScrollToBottom = true;
                }
            },
            error: () => {}
        });

        this.msgService.getConversations().subscribe({
            next: (convs) => this.conversations.set(convs),
            error: () => {}
        });
    }

    openNewConversationModal() {
        this.showNewConv.set(true);
        this.contactSearchQuery.set('');
        this.selectedRoleFilter.set('ALL');
        this.loadContacts();
    }

    loadContacts() {
        this.isLoadingContacts.set(true);
        this.msgService.getContacts(this.contactSearchQuery(), this.selectedRoleFilter()).subscribe({
            next: (list) => {
                this.contacts.set(list);
                this.isLoadingContacts.set(false);
            },
            error: () => {
                this.isLoadingContacts.set(false);
            }
        });
    }

    onContactSearchChange(query: string) {
        this.contactSearchQuery.set(query);
        this.loadContacts();
    }

    onRoleFilterChange(role: string) {
        this.selectedRoleFilter.set(role);
        this.loadContacts();
    }

    startConversationWithContact(contact: ChatContact) {
        this.showNewConv.set(false);
        this.startConversationWithId(contact.user_id);
    }

    startConversationWithId(recipientId: string) {
        if (!recipientId.trim()) return;

        this.msgService.startConversation(recipientId.trim()).subscribe({
            next: (conv) => {
                this.loadConversations();
                this.selectConversation(conv);
                this.manualRecipientId.set('');
                this.showNewConv.set(false);
            },
            error: () => {}
        });
    }

    // Attachment & File Handling
    triggerFileInput() {
        if (this.fileInput) {
            this.fileInput.nativeElement.click();
        }
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        let fileType = 'file';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type === 'application/pdf') fileType = 'pdf';
        else if (file.type.startsWith('audio/')) fileType = 'audio';

        const previewUrl = fileType === 'image' ? URL.createObjectURL(file) : undefined;

        this.pendingAttachment.set({
            file,
            name: file.name,
            type: fileType,
            size: file.size,
            previewUrl
        });

        // Reset input for next selection
        input.value = '';
    }

    removePendingAttachment() {
        this.pendingAttachment.set(null);
    }

    // Group & Class Channels
    openCreateChannelModal() {
        this.newChannelTitle.set('');
        this.newChannelDescription.set('');
        this.newChannelType.set('GROUP');
        this.showCreateChannelModal.set(true);
    }

    createChannel() {
        const title = this.newChannelTitle().trim();
        if (!title || this.isCreatingChannel()) return;

        this.isCreatingChannel.set(true);
        this.msgService.createGroupChannel(
            title,
            this.newChannelDescription().trim(),
            this.newChannelType(),
            this.newChannelIsAnnouncement()
        ).subscribe({
            next: (conv) => {
                this.isCreatingChannel.set(false);
                this.showCreateChannelModal.set(false);
                this.loadConversations();
                this.selectConversation(conv);
            },
            error: () => { this.isCreatingChannel.set(false); }
        });
    }

    // Safeguarding & Message Reporting
    openReportModal(msg: Message) {
        this.reportingMessage.set(msg);
        this.reportReason.set('Inappropriate communication');
        this.reportDetails.set('');
        this.reportSuccessMessage.set('');
        this.showReportModal.set(true);
    }

    submitReport() {
        const msg = this.reportingMessage();
        if (!msg || this.isSubmittingReport()) return;

        this.isSubmittingReport.set(true);
        const fullReason = `${this.reportReason()}: ${this.reportDetails().trim()}`;

        this.msgService.flagMessage(msg.id, fullReason).subscribe({
            next: () => {
                this.isSubmittingReport.set(false);
                this.reportSuccessMessage.set('Thank you. The report has been flagged to the school administration for immediate safeguarding review.');
                setTimeout(() => {
                    this.showReportModal.set(false);
                    this.reportingMessage.set(null);
                }, 2200);
            },
            error: () => {
                this.isSubmittingReport.set(false);
            }
        });
    }

    isSentByMe(msg: Message): boolean {
        return msg.sender_id === this.currentUserId();
    }

    getOtherParticipantName(conv: Conversation): string {
        if (conv.type === 'GROUP' || conv.type === 'CLASS') {
            return conv.title || 'Campus Channel';
        }
        if (conv.other_participant?.name) {
            return conv.other_participant.name;
        }
        const me = this.currentUserId();
        const otherId = conv.participant_a === me ? conv.participant_b : conv.participant_a;
        return `User #${otherId.slice(0, 6)}`;
    }

    getOtherParticipantSubtitle(conv: Conversation): string {
        if (conv.type === 'GROUP' || conv.type === 'CLASS') {
            return conv.description || 'Official Cohort Channel';
        }
        return conv.other_participant?.subtitle || conv.other_participant?.role || 'Campus Member';
    }

    getOtherParticipantRole(conv: Conversation): string {
        if (conv.type === 'GROUP' || conv.type === 'CLASS') {
            return conv.type;
        }
        return conv.other_participant?.role || 'MEMBER';
    }

    getRoleBadgeClass(role: string): string {
        switch (role?.toUpperCase()) {
            case 'GROUP':
            case 'CLASS':
                return 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30';
            case 'ADMIN':
            case 'ECOPOWER_ADMIN':
                return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
            case 'TEACHER':
            case 'HEADMASTER':
                return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
            case 'GUARDIAN':
            case 'PARENT':
                return 'bg-purple-500/15 text-purple-500 border-purple-500/30';
            case 'STUDENT':
                return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
            default:
                return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
        }
    }

    getRoleIcon(role: string): string {
        switch (role?.toUpperCase()) {
            case 'GROUP':
            case 'CLASS':
                return 'fa-users-rectangle';
            case 'ADMIN':
            case 'ECOPOWER_ADMIN':
                return 'fa-shield-halved';
            case 'TEACHER':
            case 'HEADMASTER':
                return 'fa-chalkboard-user';
            case 'GUARDIAN':
            case 'PARENT':
                return 'fa-user-group';
            case 'STUDENT':
                return 'fa-graduation-cap';
            default:
                return 'fa-user';
        }
    }

    // Typing indicator broadcasting
    onMessageInputChange(val: string) {
        this.newMessage.set(val);
        const active = this.activeConversation();
        if (!active) return;
        this.msgService.sendWsTyping(active.id, true);
        if (this.typingDebounce) clearTimeout(this.typingDebounce);
        this.typingDebounce = setTimeout(() => {
            this.msgService.sendWsTyping(active.id, false);
        }, 2500);
    }

    isOtherUserTyping(): boolean {
        const active = this.activeConversation();
        if (!active) return false;
        return !!this.typingMap[active.id];
    }

    // Emoji Reactions
    reactToMessage(msg: Message, emoji: string) {
        const name = this.currentUser()?.username ?? this.currentUser()?.email ?? 'You';
        this.msgService.addReaction(msg.id, emoji, name).subscribe({
            next: () => { this.refreshActiveThreadSilently(); },
            error: () => {}
        });
    }

    getParsedReactions(msg: Message): Record<string, string[]> {
        return this.msgService.parseReactions(msg.reactions);
    }

    getReactionEntries(msg: Message): { emoji: string; users: string[]; count: number }[] {
        const map = this.getParsedReactions(msg);
        return Object.entries(map).map(([emoji, users]) => ({ emoji, users, count: users.length }));
    }

    // Voice Notes
    async startVoiceNote() {
        try {
            await this.msgService.startVoiceRecording();
            this.voiceRecordDuration.set(0);
            this.voiceDurationTimer = setInterval(() => {
                this.voiceRecordDuration.update(d => d + 1);
            }, 1000);
        } catch {
            alert('Microphone access is required to record voice notes. Please allow mic permissions.');
        }
    }

    async stopAndSendVoiceNote() {
        if (this.voiceDurationTimer) clearInterval(this.voiceDurationTimer);
        const conv = this.activeConversation();
        if (!conv) { this.msgService.cancelVoiceRecording(); return; }
        try {
            const audioFile = await this.msgService.stopVoiceRecording();
            this.isSending.set(true);
            this.msgService.uploadAttachment(audioFile).subscribe({
                next: (uploadRes) => {
                    this.msgService.sendMessage(conv.id, '', undefined, uploadRes).subscribe({
                        next: (msg) => {
                            this.messages.update(msgs => [...msgs, msg]);
                            this.isSending.set(false);
                            this.shouldScrollToBottom = true;
                            this.loadConversations();
                        },
                        error: () => this.isSending.set(false)
                    });
                },
                error: () => this.isSending.set(false)
            });
        } catch {
            this.isSending.set(false);
        }
    }

    cancelVoiceNote() {
        if (this.voiceDurationTimer) clearInterval(this.voiceDurationTimer);
        this.msgService.cancelVoiceRecording();
        this.voiceRecordDuration.set(0);
    }

    formatVoiceDuration(secs: number): string {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // AI Campus Assistant
    askAiAssistant() {
        const q = this.aiQuery().trim();
        if (!q || this.isAiThinking()) return;
        this.isAiThinking.set(true);
        this.aiResponse.set(null);
        this.msgService.askAiAssistant(q).subscribe({
            next: (res) => {
                this.aiResponse.set(res);
                this.isAiThinking.set(false);
            },
            error: () => {
                this.isAiThinking.set(false);
                this.aiResponse.set({ query: q, answer: 'Sorry, the AI assistant is temporarily unavailable. Please contact the school office directly.', suggestions: [] });
            }
        });
    }

    insertAiAnswer() {
        const res = this.aiResponse();
        if (!res) return;
        this.newMessage.set(res.answer);
        this.showAiAssistant.set(false);
    }

    send() {
        const conv = this.activeConversation();
        const content = this.newMessage().trim();
        const pending = this.pendingAttachment();

        if (!conv || (!content && !pending) || this.isSending()) return;

        this.isSending.set(true);
        const parentId = this.replyingTo()?.id;
        // Stop typing indicator
        if (this.typingDebounce) clearTimeout(this.typingDebounce);
        this.msgService.sendWsTyping(conv.id, false);

        const options = {
            is_urgent: this.isUrgentMessage(),
            fallback_sms: this.fallbackSMS()
        };

        if (pending) {
            this.msgService.uploadAttachment(pending.file).subscribe({
                next: (uploadRes) => {
                    this.msgService.sendMessage(conv.id, content, parentId, uploadRes, options).subscribe({
                        next: (msg) => {
                            this.messages.update(msgs => [...msgs, msg]);
                            this.newMessage.set('');
                            this.pendingAttachment.set(null);
                            this.replyingTo.set(null);
                            this.isUrgentMessage.set(false);
                            this.fallbackSMS.set(false);
                            this.isSending.set(false);
                            this.shouldScrollToBottom = true;
                            this.loadConversations();
                        },
                        error: () => this.isSending.set(false)
                    });
                },
                error: () => this.isSending.set(false)
            });
        } else {
            this.msgService.sendMessage(conv.id, content, parentId, undefined, options).subscribe({
                next: (msg) => {
                    this.messages.update(msgs => [...msgs, msg]);
                    this.newMessage.set('');
                    this.replyingTo.set(null);
                    this.isUrgentMessage.set(false);
                    this.fallbackSMS.set(false);
                    this.isSending.set(false);
                    this.shouldScrollToBottom = true;
                    this.loadConversations();
                },
                error: () => this.isSending.set(false)
            });
        }
    }

    // Pinning
    togglePin(msg: Message) {
        const conv = this.activeConversation();
        if (!conv) return;
        this.msgService.togglePin(conv.id, msg.id).subscribe({
            next: (res) => {
                this.messages.update(msgs => msgs.map(m => m.id === msg.id ? { ...m, is_pinned: res.is_pinned } : m));
                this.loadConversations();
            },
            error: () => {}
        });
    }

    scrollToMessage(messageId: string) {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-primary-500', 'bg-primary-500/10');
            setTimeout(() => {
                el.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-500/10');
            }, 2500);
        }
    }

    // Granular Read Receipts
    openReadReceipts(msg: Message) {
        this.inspectingMessage.set(msg);
        this.isLoadingReceipts.set(true);
        this.showReadReceiptsModal.set(true);
        this.msgService.getReadReceipts(msg.id).subscribe({
            next: (receipts) => {
                this.readReceiptsList.set(receipts || []);
                this.isLoadingReceipts.set(false);
            },
            error: () => {
                this.readReceiptsList.set([]);
                this.isLoadingReceipts.set(false);
            }
        });
    }

    // AI Catch-Up Channel Summarizer
    summarizeActiveChannel() {
        const conv = this.activeConversation();
        if (!conv) return;
        this.isSummarizing.set(true);
        this.channelSummary.set('');
        this.showSummarizerModal.set(true);
        this.msgService.summarizeChannel(conv.id).subscribe({
            next: (res) => {
                this.channelSummary.set(res.summary);
                this.isSummarizing.set(false);
            },
            error: () => {
                this.channelSummary.set('⚠️ Unable to generate summary at this moment.');
                this.isSummarizing.set(false);
            }
        });
    }

    // Multi-Language Auto Translation
    translateMessage(msg: Message, targetLang?: string) {
        const lang = targetLang || this.selectedTranslateLang();
        if (!msg.content) return;

        const isTrans = this.isTranslating();
        isTrans[msg.id] = true;
        this.isTranslating.set({ ...isTrans });

        this.msgService.translateMessage(msg.content, lang).subscribe({
            next: (res) => {
                this.messages.update(msgs => msgs.map(m => {
                    if (m.id === msg.id) {
                        return { ...m, translated_text: res.translated_text, show_translation: true };
                    }
                    return m;
                }));
                const t = this.isTranslating();
                delete t[msg.id];
                this.isTranslating.set({ ...t });
            },
            error: () => {
                const t = this.isTranslating();
                delete t[msg.id];
                this.isTranslating.set({ ...t });
            }
        });
    }

    toggleTranslation(msg: Message) {
        this.messages.update(msgs => msgs.map(m => {
            if (m.id === msg.id) {
                return { ...m, show_translation: !m.show_translation };
            }
            return m;
        }));
    }

    toggleTranscript(msg: Message) {
        this.messages.update(msgs => msgs.map(m => {
            if (m.id === msg.id) {
                return { ...m, show_transcript: !m.show_transcript };
            }
            return m;
        }));
    }

    // Document / PDF Preview Lightbox
    openDocPreview(msg: Message) {
        if (!msg.attachment_url) return;
        this.previewDocModal.set({
            url: msg.attachment_url,
            name: msg.attachment_name || 'Document',
            type: msg.attachment_type || 'file'
        });
    }

    closeDocPreview() {
        this.previewDocModal.set(null);
    }

    // Export Chat History
    exportChatHistory() {
        const conv = this.activeConversation();
        if (!conv) return;
        this.msgService.downloadExport(conv.id);
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

    getInitial(nameOrId: string): string {
        if (!nameOrId) return '?';
        const cleaned = nameOrId.trim();
        return cleaned.charAt(0).toUpperCase();
    }

    useQuickReply(text: string) {
        this.newMessage.set(text);
    }

    insertAiFaq(faq: { title: string; text: string }) {
        this.newMessage.set(faq.text);
        this.showAiAssistant.set(false);
    }

    isAnnouncementChannel(): boolean {
        const c = this.activeConversation();
        return !!(c && c.is_announcement);
    }

    canPostInChannel(): boolean {
        const c = this.activeConversation();
        if (!c) return false;
        if (!c.is_announcement) return true;
        const role = this.currentUserRole();
        return role !== Role.STUDENT && role !== Role.GUARDIAN;
    }

    // Pinned messages in active conversation
    pinnedMessages = computed(() => this.messages().filter(m => m.is_pinned));

    // Filtered messages in active conversation based on search bar
    filteredChatMessages = computed(() => {
        const query = this.chatSearchQuery().toLowerCase().trim();
        const msgs = this.messages();
        if (!query) return msgs;
        return msgs.filter(m => 
            (m.content || '').toLowerCase().includes(query) || 
            (m.attachment_name || '').toLowerCase().includes(query) ||
            (m.poll_data || '').toLowerCase().includes(query) ||
            (m.action_card_data || '').toLowerCase().includes(query)
        );
    });

    // ── Interactive Polls ─────────────────────────────────────────
    openPollModal() {
        this.pollQuestion.set('');
        this.pollOption1.set('');
        this.pollOption2.set('');
        this.pollOption3.set('');
        this.pollOption4.set('');
        this.showPollModal.set(true);
    }

    createPoll() {
        const conv = this.activeConversation();
        const q = this.pollQuestion().trim();
        if (!conv || !q) return;

        const options = [
            { id: 'opt_1', text: this.pollOption1().trim(), votes: [] },
            { id: 'opt_2', text: this.pollOption2().trim(), votes: [] }
        ];
        if (this.pollOption3().trim()) {
            options.push({ id: 'opt_3', text: this.pollOption3().trim(), votes: [] });
        }
        if (this.pollOption4().trim()) {
            options.push({ id: 'opt_4', text: this.pollOption4().trim(), votes: [] });
        }

        const pollData = {
            question: q,
            options: options.filter(o => !!o.text)
        };

        if (pollData.options.length < 2) return;

        this.msgService.sendMessage(conv.id, `📊 Poll: ${q}`, undefined, undefined, {
            message_type: 'POLL',
            poll_data: JSON.stringify(pollData)
        }).subscribe({
            next: (msg) => {
                this.messages.update(msgs => [...msgs, msg]);
                this.showPollModal.set(false);
                this.shouldScrollToBottom = true;
                this.loadConversations();
            }
        });
    }

    votePoll(msg: Message, optionId: string) {
        this.msgService.votePoll(msg.id, optionId).subscribe({
            next: () => {
                this.refreshActiveThreadSilently();
            }
        });
    }

    getParsedPoll(msg: Message) {
        return this.msgService.parsePollData(msg.poll_data);
    }

    hasVotedOption(option: any): boolean {
        const me = this.currentUser()?.username || this.currentUserId();
        return (option.votes || []).includes(me) || (option.votes || []).includes(this.currentUserId());
    }

    getTotalPollVotes(poll: any): number {
        if (!poll || !poll.options) return 0;
        return poll.options.reduce((acc: number, o: any) => acc + (o.votes?.length || 0), 0);
    }

    getOptionVotePercent(poll: any, option: any): number {
        const total = this.getTotalPollVotes(poll);
        if (total === 0) return 0;
        return Math.round(((option.votes?.length || 0) / total) * 100);
    }

    // ── Video Conference Launcher ────────────────────────────────
    openMeetingModal() {
        const conv = this.activeConversation();
        const defaultTopic = conv?.title ? `${conv.title} Virtual Classroom` : 'Parent-Teacher Conference';
        this.meetingTopic.set(defaultTopic);
        this.showMeetingModal.set(true);
    }

    launchMeeting() {
        const conv = this.activeConversation();
        const topic = this.meetingTopic().trim() || 'Parent-Teacher Virtual Conference';
        if (!conv) return;

        const roomCode = `schoollinx-${conv.id.slice(0, 8)}-${Date.now()}`;
        const meetingUrl = `https://meet.jit.si/${roomCode}`;
        const hostName = this.currentUser()?.username || 'Teacher';

        const meetingData = {
            room_name: roomCode,
            meeting_url: meetingUrl,
            topic: topic,
            host_name: hostName
        };

        this.msgService.sendMessage(conv.id, `📹 Video Meeting: ${topic}`, undefined, undefined, {
            message_type: 'MEETING',
            meeting_data: JSON.stringify(meetingData)
        }).subscribe({
            next: (msg) => {
                this.messages.update(msgs => [...msgs, msg]);
                this.showMeetingModal.set(false);
                this.shouldScrollToBottom = true;
                this.loadConversations();
            }
        });
    }

    getParsedMeeting(msg: Message) {
        return this.msgService.parseMeetingData(msg.meeting_data);
    }

    // ── Action Cards (Fee Payment / Report Card) ──────────────────
    openActionCardModal() {
        this.cardTitle.set('Term 2 Tuition Fee Invoice');
        this.cardSubtitle.set('Official invoice issued. Click below to pay online via MoMo or Card.');
        this.cardType.set('PAY_FEE');
        this.cardPayload.set('/parents/payments');
        this.showActionCardModal.set(true);
    }

    sendActionCard() {
        const conv = this.activeConversation();
        if (!conv) return;

        const actionData = {
            title: this.cardTitle().trim(),
            subtitle: this.cardSubtitle().trim(),
            action_type: this.cardType(),
            action_payload: this.cardPayload().trim() || (this.cardType() === 'PAY_FEE' ? '/parents/payments' : '/portal/terminal-reports'),
            button_text: this.cardType() === 'PAY_FEE' ? 'Pay Online (MoMo/Card)' : 'View Report Card',
            icon: this.cardType() === 'PAY_FEE' ? 'fa-credit-card' : 'fa-file-signature',
            badge: this.cardType() === 'PAY_FEE' ? 'PAYMENT REQUIRED' : 'ACADEMIC RELEASE'
        };

        this.msgService.sendMessage(conv.id, `📋 ${actionData.title}`, undefined, undefined, {
            message_type: 'ACTION_CARD',
            action_card_data: JSON.stringify(actionData)
        }).subscribe({
            next: (msg) => {
                this.messages.update(msgs => [...msgs, msg]);
                this.showActionCardModal.set(false);
                this.shouldScrollToBottom = true;
                this.loadConversations();
            }
        });
    }

    getParsedActionCard(msg: Message) {
        return this.msgService.parseActionCardData(msg.action_card_data);
    }

    // ── Media & Document Vault ────────────────────────────────────
    openMediaVault() {
        const conv = this.activeConversation();
        if (!conv) return;
        this.isLoadingMedia.set(true);
        this.showMediaVault.set(true);
        this.msgService.getChannelMedia(conv.id).subscribe({
            next: (media) => {
                this.channelMediaList.set(media);
                this.isLoadingMedia.set(false);
            },
            error: () => this.isLoadingMedia.set(false)
        });
    }

    // ── Channel Members Roster ────────────────────────────────────
    openMembersDrawer() {
        const conv = this.activeConversation();
        if (!conv) return;
        this.isLoadingMembers.set(true);
        this.showMembersDrawer.set(true);
        this.msgService.getChannelMembers(conv.id).subscribe({
            next: (members) => {
                this.channelMembersList.set(members);
                this.isLoadingMembers.set(false);
            },
            error: () => this.isLoadingMembers.set(false)
        });
    }

    canModerate(): boolean {
        const role = this.currentUserRole();
        return role === Role.ADMIN || role === Role.ECOPOWER_ADMIN || role === Role.TEACHER || role === Role.HEADMASTER;
    }

    formatFileSize(bytes?: number): string {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    formatDate(dateStr: string | undefined): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    formatMessageTime(dateStr: string): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ── Message Scheduler ────────────────────────────────────────
    openSchedulerModal() {
        this.scheduledContent.set(this.newMessage().trim());
        // Default to 1 hour from now
        const future = new Date(Date.now() + 60 * 60 * 1000);
        const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
            .toISOString().slice(0, 16);
        this.scheduledFor.set(local);
        this.scheduleSuccess.set('');
        this.showSchedulerModal.set(true);
    }

    submitSchedule() {
        const conv = this.activeConversation();
        const content = this.scheduledContent().trim();
        const when = this.scheduledFor();
        if (!conv || !content || !when || this.isScheduling()) return;

        this.isScheduling.set(true);
        const isoWhen = new Date(when).toISOString();
        this.msgService.scheduleMessage(conv.id, content, isoWhen).subscribe({
            next: () => {
                this.isScheduling.set(false);
                this.scheduleSuccess.set('Message scheduled successfully ✓');
                this.newMessage.set('');
                setTimeout(() => this.showSchedulerModal.set(false), 1800);
            },
            error: () => {
                this.isScheduling.set(false);
                this.scheduleSuccess.set('⚠️ Failed to schedule. Please try again.');
            }
        });
    }

    openScheduledDrawer() {
        const conv = this.activeConversation();
        if (!conv) return;
        this.isLoadingScheduled.set(true);
        this.showScheduledDrawer.set(true);
        this.msgService.getScheduledMessages(conv.id).subscribe({
            next: (msgs) => {
                this.scheduledMessages.set(msgs);
                this.isLoadingScheduled.set(false);
            },
            error: () => this.isLoadingScheduled.set(false)
        });
    }

    cancelScheduledMessage(id: string) {
        this.cancellingScheduledId.set(id);
        this.msgService.cancelScheduledMessage(id).subscribe({
            next: () => {
                this.scheduledMessages.update(msgs => msgs.filter(m => m.id !== id));
                this.cancellingScheduledId.set(null);
            },
            error: () => this.cancellingScheduledId.set(null)
        });
    }

    // ── Channel Analytics ─────────────────────────────────────────
    openAnalyticsPanel() {
        const conv = this.activeConversation();
        if (!conv) return;
        this.isLoadingAnalytics.set(true);
        this.channelAnalytics.set(null);
        this.showAnalyticsPanel.set(true);
        this.msgService.getChannelAnalytics(conv.id).subscribe({
            next: (analytics) => {
                this.channelAnalytics.set(analytics);
                this.isLoadingAnalytics.set(false);
            },
            error: () => this.isLoadingAnalytics.set(false)
        });
    }

    getAnalyticsObjectKeys(obj: Record<string, any> | null | undefined): string[] {
        if (!obj) return [];
        return Object.keys(obj);
    }

    // ── Bot Triggers ─────────────────────────────────────────────
    triggerBot(type: 'attendance' | 'fee' | 'exam') {
        const conv = this.activeConversation();
        if (!conv || this.isTriggeringBot()) return;
        this.isTriggeringBot.set(true);
        this.botSuccessMessage.set('');
        this.showBotMenu.set(false);

        const obs = type === 'attendance'
            ? this.msgService.triggerAttendanceDigest(conv.id)
            : type === 'fee'
                ? this.msgService.triggerFeeReminder(conv.id)
                : this.msgService.triggerExamCountdown(conv.id);

        obs.subscribe({
            next: (res) => {
                this.isTriggeringBot.set(false);
                this.botSuccessMessage.set(res.message || 'Bot alert delivered ✓');
                this.refreshActiveThreadSilently();
                setTimeout(() => this.botSuccessMessage.set(''), 4000);
            },
            error: () => {
                this.isTriggeringBot.set(false);
                this.botSuccessMessage.set('⚠️ Bot trigger failed. Please try again.');
                setTimeout(() => this.botSuccessMessage.set(''), 4000);
            }
        });
    }
}


