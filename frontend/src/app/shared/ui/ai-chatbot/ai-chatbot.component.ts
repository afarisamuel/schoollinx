import {
    Component,
    OnInit,
    OnDestroy,
    signal,
    computed,
    inject,
    ViewChild,
    ElementRef,
    AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ChatbotService, ChatMessage, ChatAction, ChatAttachment, AIMode, ChatChart } from './chatbot.service';
import { AuthService } from '../../../core/infrastructure/auth/auth.service';
import { MessagingService } from '../../../core/infrastructure/communications/messaging.service';
import { StudentService } from '../../../core/infrastructure/student/student.service';
import { ClassService, Class } from '../../../core/infrastructure/curriculum/class.service';
import { CommunicationService } from '../../../core/infrastructure/communication/communication.service';
import { AttendanceService } from '../../../core/infrastructure/attendance/attendance.service';
import { ToastService } from '../toast/toast.service';
import { Student } from '../../../core/domain/student.model';
import { Attendance, AttendanceStatus } from '../../../core/domain/attendance.model';

@Component({
    selector: 'app-ai-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './ai-chatbot.component.html',
    styleUrl: './ai-chatbot.component.css',
})
export class AiChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messageContainer') private messageContainer!: ElementRef;
    @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;
    @ViewChild('admissionScanInput') private admissionScanInputRef!: ElementRef<HTMLInputElement>;

    private chatbot = inject(ChatbotService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private messagingService = inject(MessagingService);
    private studentService = inject(StudentService);
    private classService = inject(ClassService);
    private communicationService = inject(CommunicationService);
    private attendanceService = inject(AttendanceService);
    private toast = inject(ToastService);
    private routeSub?: Subscription;

    // Authorization: Admin, Teachers, Bursars, Librarians
    isAuthorized = computed(() => {
        const role = this.auth.currentUserValue?.role;
        return !!role && ['ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'SUPER_ADMIN'].includes(role);
    });

    currentRoute = signal<string>(this.router.url);
    isOnMessagingHub = computed(() => this.currentRoute().includes('/communications/messages'));

    isOpen = signal(false);
    isExpanded = signal(false);
    isTyping = signal(false);
    userInput = signal('');
    messages = signal<ChatMessage[]>([]);

    // Focus Mode State
    readonly modeOptions = this.chatbot.modeOptions;
    selectedMode = signal<AIMode>('general');

    // Speech & Voice State
    isRecording = signal(false);
    speechRecognitionAvailable = signal(false);
    isTwoWayVoiceMode = signal(false);
    private recognition: any = null;

    // One-Click Broadcast SMS Automation State
    isSmsBroadcastModalOpen = signal(false);
    smsTargetAudience = signal<string>('ALL_PARENTS');
    smsMessageDraft = signal<string>('');
    isSendingSms = signal(false);

    // One-Click Quick Class Roll-Call Automation State
    isRollCallModalOpen = signal(false);
    selectedRollCallClassId = signal<string>('');
    rollCallDate = signal<string>(new Date().toISOString().slice(0, 10));
    rollCallStudents = signal<Student[]>([]);
    rollCallStatusMap = signal<{ [studentId: string]: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' }>({});
    isLoadingRollCallStudents = signal(false);
    isSavingRollCall = signal(false);

    // Admission Form OCR & Verification Modal State
    isScanReviewModalOpen = signal(false);
    isScanningAdmissionForm = signal(false);
    isEnrollingStudent = signal(false);
    scanConfidence = signal<number>(0);
    detectedFieldsCount = signal<number>(0);
    scanPreviewThumbnail = signal<string | null>(null);
    activeReviewTab = signal<'biodata' | 'guardians' | 'health'>('biodata');
    availableClasses = signal<Class[]>([]);

    // Scanned Student Data
    scannedStudent = signal<any>({
        first_name: '',
        last_name: '',
        other_name: '',
        gender: 'male',
        dob: '',
        phone_number: '',
        address: '',
        level: 1,
        class_id: '',
        placed_residence_type: 'Day',
        father_name: '',
        father_phone: '',
        father_email: '',
        father_occupation: '',
        mother_name: '',
        mother_phone: '',
        mother_email: '',
        mother_occupation: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: '',
        guardian_relation: 'Parent',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        blood_group: '',
        allergies: '',
        health_conditions: ''
    });

    commonAllergies = ['Peanuts', 'Penicillin', 'Dust', 'Latex', 'Dairy', 'Eggs', 'Seafood', 'Asthma Trigger'];

    isSpeaking = signal(false);
    activeSpeakingId = signal<string | null>(null);
    copiedMessageId = signal<string | null>(null);

    // Attachment & Drag/Drop State
    selectedAttachment = signal<{ name: string; type: string; base64: string; previewUrl?: string } | null>(null);
    isDragging = signal(false);

    // Sound toggle
    soundEnabled = signal(true);

    // Dynamic Prompts based on active focus mode & active route
    currentPrompts = computed(() => this.chatbot.getModePrompts(this.selectedMode(), this.currentRoute()));

    ngOnInit() {
        this.messages.set([this.chatbot.getGreeting()]);
        this.initSpeechRecognition();
        this.loadClasses();

        this.routeSub = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentRoute.set(event.urlAfterRedirects || event.url);
        });
    }

    private loadClasses() {
        this.classService.getClasses().subscribe({
            next: cls => this.availableClasses.set(cls || []),
            error: () => this.availableClasses.set([]),
        });
    }

    ngOnDestroy() {
        this.routeSub?.unsubscribe();
        this.stopSpeechSynthesis();
        if (this.recognition && this.isRecording()) {
            this.recognition.stop();
        }
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    toggle() {
        const nextState = !this.isOpen();
        this.isOpen.set(nextState);
        if (nextState) {
            this.messagingService.closeFloatingChat();
        } else {
            this.stopSpeechSynthesis();
            if (this.isRecording()) this.stopVoiceInput();
        }
    }

    close() {
        this.isOpen.set(false);
        this.isExpanded.set(false);
        this.stopSpeechSynthesis();
        if (this.isRecording()) this.stopVoiceInput();
    }

    toggleExpand() {
        this.isExpanded.update(v => !v);
    }

    clearChat() {
        this.stopSpeechSynthesis();
        this.messages.set([this.chatbot.getGreeting()]);
    }

    /* ----------------------------------------------------
       Message Sending & Gemini Integration
    ---------------------------------------------------- */
    sendMessage() {
        const text = this.userInput().trim();
        const attachment = this.selectedAttachment();
        if (!text && !attachment) return;

        // If in admission_ocr mode and attachment is present, trigger admission OCR
        if (this.selectedMode() === 'admission_ocr' && attachment) {
            this.handleAdmissionOcrFromAttachment(attachment, text);
            return;
        }

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text || (attachment ? `Analyze attached ${attachment.name}` : ''),
            timestamp: new Date(),
            type: 'text',
            attachment: attachment ? { ...attachment } : undefined,
        };

        this.messages.update(msgs => [...msgs, userMsg]);
        this.userInput.set('');
        this.selectedAttachment.set(null);
        this.isTyping.set(true);

        const sendText = userMsg.content;
        const currentMsgs = this.messages();
        const route = this.currentRoute();

        this.chatbot.processMessage(
            sendText,
            currentMsgs,
            route,
            attachment ? { base64: attachment.base64, mime: attachment.type, name: attachment.name } : undefined
        ).subscribe({
            next: response => {
                this.messages.update(msgs => [...msgs, response]);
                this.isTyping.set(false);
                this.playChime();
            },
            error: () => {
                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: 'Sorry, I encountered an unexpected error processing your request. Please try again.',
                        timestamp: new Date(),
                        type: 'error',
                    },
                ]);
                this.isTyping.set(false);
            },
        });
    }

    private handleAdmissionOcrFromAttachment(attachment: { name: string; type: string; base64: string; previewUrl?: string }, userNote: string) {
        // Convert base64 to Blob
        fetch(attachment.base64)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], attachment.name, { type: attachment.type });
                this.selectedAttachment.set(null);
                this.userInput.set('');
                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'user',
                        content: userNote ? `${userNote} (Attached Form: ${attachment.name})` : `Analyze handwritten admission form: ${attachment.name}`,
                        timestamp: new Date(),
                        type: 'text',
                        attachment: { ...attachment },
                    },
                ]);
                this.processAdmissionScanFile(file);
            })
            .catch(() => {
                this.toast.error('Failed to process image attachment for admission scan.');
            });
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    sendQuickPrompt(prompt: string) {
        const lower = prompt.toLowerCase();
        if (lower.includes('scan admission') || lower.includes('scan handwritten') || lower.includes('digitize student')) {
            this.triggerAdmissionScan();
            return;
        }
        this.userInput.set(prompt);
        this.sendMessage();
    }

    /* ----------------------------------------------------
       Admission Form OCR Scan & Verification Modal Logic
    ---------------------------------------------------- */
    triggerAdmissionScan() {
        this.admissionScanInputRef?.nativeElement?.click();
    }

    onAdmissionScanFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        if (file.size > 15 * 1024 * 1024) {
            this.toast.error('File size exceeds 15MB limit.');
            input.value = '';
            return;
        }

        // Preview thumbnail
        const reader = new FileReader();
        reader.onload = () => {
            this.scanPreviewThumbnail.set(reader.result as string);
        };
        reader.readAsDataURL(file);

        this.processAdmissionScanFile(file);
        input.value = '';
    }

    processAdmissionScanFile(file: File | Blob) {
        this.isScanningAdmissionForm.set(true);

        this.studentService.scanAdmissionForm(file, false).subscribe({
            next: res => {
                this.isScanningAdmissionForm.set(false);
                const raw = res.extracted_data || {};

                this.scannedStudent.set({
                    first_name: raw.first_name || '',
                    last_name: raw.last_name || '',
                    other_name: raw.other_name || '',
                    gender: raw.gender ? raw.gender.toLowerCase() : 'male',
                    dob: raw.dob || '',
                    phone_number: raw.phone_number || '',
                    address: raw.address || '',
                    level: raw.level || 1,
                    class_id: raw.class_id || '',
                    placed_residence_type: raw.placed_residence_type || 'Day',
                    father_name: raw.father_name || '',
                    father_phone: raw.father_phone || '',
                    father_email: raw.father_email || '',
                    father_occupation: raw.father_occupation || '',
                    mother_name: raw.mother_name || '',
                    mother_phone: raw.mother_phone || '',
                    mother_email: raw.mother_email || '',
                    mother_occupation: raw.mother_occupation || '',
                    guardian_name: raw.guardian_name || '',
                    guardian_phone: raw.guardian_phone || '',
                    guardian_email: raw.guardian_email || '',
                    guardian_relation: raw.guardian_relation || 'Parent',
                    emergency_contact_name: raw.emergency_contact_name || '',
                    emergency_contact_phone: raw.emergency_contact_phone || '',
                    blood_group: raw.blood_group || '',
                    allergies: raw.allergies || '',
                    health_conditions: raw.health_conditions || '',
                });

                this.scanConfidence.set(Math.round(res.confidence_score || 95));
                this.detectedFieldsCount.set(res.detected_fields_count || Object.keys(raw).length || 15);
                this.activeReviewTab.set('biodata');
                this.isScanReviewModalOpen.set(true);
                this.playChime();

                // Post a status message to Chatbot
                const candidateName = [raw.first_name, raw.last_name].filter(Boolean).join(' ') || 'Candidate';
                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `📄 **Admission Document Digitize Complete**\n\nExtracted particulars for **${candidateName}** with **${Math.round(res.confidence_score || 95)}% AI Confidence**.\n\nPlease review and verify the candidate information in the verification modal before final enrollment.`,
                        timestamp: new Date(),
                        type: 'text',
                    },
                ]);
            },
            error: err => {
                this.isScanningAdmissionForm.set(false);
                const errorMsg = err?.error?.error || 'Failed to scan admission document. Please ensure document is sharp and legible.';
                this.toast.error(errorMsg, 'OCR Scan Failed');
                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `⚠️ **OCR Scan Error**: ${errorMsg}`,
                        timestamp: new Date(),
                        type: 'error',
                    },
                ]);
            },
        });
    }

    closeScanReviewModal() {
        this.isScanReviewModalOpen.set(false);
    }

    setReviewTab(tab: 'biodata' | 'guardians' | 'health') {
        this.activeReviewTab.set(tab);
    }

    updateScannedField(field: string, value: any) {
        this.scannedStudent.update(curr => ({
            ...curr,
            [field]: value,
        }));
    }

    setGender(gender: string) {
        this.updateScannedField('gender', gender);
    }

    setResidenceType(type: string) {
        this.updateScannedField('placed_residence_type', type);
    }

    setBloodGroup(bg: string) {
        const current = this.scannedStudent().blood_group;
        this.updateScannedField('blood_group', current === bg ? '' : bg);
    }

    toggleAllergy(allergy: string) {
        const current = this.scannedStudent().allergies || '';
        const list = current ? current.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const idx = list.findIndex((a: string) => a.toLowerCase() === allergy.toLowerCase());
        if (idx > -1) {
            list.splice(idx, 1);
        } else {
            list.push(allergy);
        }
        this.updateScannedField('allergies', list.join(', '));
    }

    isAllergySelected(allergy: string): boolean {
        const current = this.scannedStudent().allergies || '';
        if (!current) return false;
        return current.split(',').map((s: string) => s.trim().toLowerCase()).includes(allergy.toLowerCase());
    }

    confirmAndEnrollStudent() {
        const student = this.scannedStudent();

        // Validation
        if (!student.first_name?.trim() || !student.last_name?.trim()) {
            this.activeReviewTab.set('biodata');
            this.toast.warning('First Name and Last Name are required.');
            return;
        }

        if (!student.gender) {
            this.activeReviewTab.set('biodata');
            this.toast.warning('Gender is required.');
            return;
        }

        if (!student.dob) {
            this.activeReviewTab.set('biodata');
            this.toast.warning('Date of Birth is required.');
            return;
        }

        this.isEnrollingStudent.set(true);

        const payload: Student = {
            first_name: student.first_name.trim(),
            last_name: student.last_name.trim(),
            other_name: student.other_name?.trim() || '',
            gender: student.gender,
            dob: student.dob,
            phone_number: student.phone_number?.trim() || '',
            address: student.address?.trim() || '',
            level: Number(student.level) || 1,
            class_id: student.class_id || undefined,
            placed_residence_type: student.placed_residence_type || 'Day',
            father_name: student.father_name?.trim() || '',
            father_phone: student.father_phone?.trim() || '',
            father_email: student.father_email?.trim() || '',
            father_occupation: student.father_occupation?.trim() || '',
            mother_name: student.mother_name?.trim() || '',
            mother_phone: student.mother_phone?.trim() || '',
            mother_email: student.mother_email?.trim() || '',
            mother_occupation: student.mother_occupation?.trim() || '',
            guardian_name: student.guardian_name?.trim() || '',
            guardian_phone: student.guardian_phone?.trim() || '',
            guardian_email: student.guardian_email?.trim() || '',
            guardian_relation: student.guardian_relation || 'Parent',
            emergency_contact_name: student.emergency_contact_name?.trim() || '',
            emergency_contact_phone: student.emergency_contact_phone?.trim() || '',
            blood_group: student.blood_group || '',
            allergies: student.allergies || '',
            health_conditions: student.health_conditions?.trim() || '',
        };

        this.studentService.createStudent(payload).subscribe({
            next: (created: Student) => {
                this.isEnrollingStudent.set(false);
                this.isScanReviewModalOpen.set(false);
                const fullName = `${created.first_name} ${created.last_name}`;
                this.toast.success(`${fullName} successfully enrolled into school database!`, 'Student Enrolled');
                this.playChime();

                // Inject celebration and action cards in AI Chatbot
                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `🎉 **Student Successfully Enrolled!**\n\n- **Candidate:** **${fullName}**\n- **Gender / DOB:** ${created.gender.toUpperCase()} · ${created.dob}\n- **Placement:** Level ${created.level || 1} (${created.placed_residence_type || 'Day'})\n- **Parent/Guardian:** ${created.father_name || created.mother_name || created.guardian_name || 'Recorded'}\n- **Emergency Contact:** ${created.emergency_contact_phone || created.father_phone || created.mother_phone || 'None'}\n\nCandidate is registered in active student ledger. What would you like to do next?`,
                        timestamp: new Date(),
                        type: 'action',
                        actions: [
                            {
                                label: 'View Student Profile',
                                action_type: 'NAVIGATE',
                                payload: `/students/details/${created.id}`,
                                icon: 'fa-user-graduate',
                            },
                            {
                                label: 'Design ID Badge',
                                action_type: 'NAVIGATE',
                                payload: '/students/id-card-studio',
                                icon: 'fa-id-badge',
                            },
                            {
                                label: 'Class Assignments',
                                action_type: 'NAVIGATE',
                                payload: '/students/class-assignment',
                                icon: 'fa-users-rectangle',
                            },
                        ],
                    },
                ]);
            },
            error: err => {
                this.isEnrollingStudent.set(false);
                this.toast.error(err?.error?.error || 'Failed to enroll student. Please check all required fields.');
            },
        });
    }

    openInFullEnrollmentWizard() {
        this.isScanReviewModalOpen.set(false);
        this.router.navigate(['/students/new'], {
            queryParams: { scan: 'true' },
        });
    }

    /* ----------------------------------------------------
       File & Image Attachment Parsing
    ---------------------------------------------------- */
    triggerFileInput() {
        this.fileInputRef?.nativeElement?.click();
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds 10MB limit.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const resultStr = reader.result as string;
            const isImage = file.type.startsWith('image/');
            this.selectedAttachment.set({
                name: file.name,
                type: file.type || 'application/octet-stream',
                base64: resultStr,
                previewUrl: isImage ? resultStr : undefined,
            });
            input.value = '';
        };
        reader.readAsDataURL(file);
    }

    onPaste(event: ClipboardEvent) {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const resultStr = reader.result as string;
                        this.selectedAttachment.set({
                            name: file.name || `Pasted_Image_${Date.now()}.png`,
                            type: file.type || 'image/png',
                            base64: resultStr,
                            previewUrl: resultStr,
                        });
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            // If in admission_ocr mode, directly run admission OCR scanner
            if (this.selectedMode() === 'admission_ocr') {
                this.processAdmissionScanFile(file);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                const resultStr = reader.result as string;
                const isImage = file.type.startsWith('image/');
                this.selectedAttachment.set({
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    base64: resultStr,
                    previewUrl: isImage ? resultStr : undefined,
                });
            };
            reader.readAsDataURL(file);
        }
    }

    removeAttachment() {
        this.selectedAttachment.set(null);
    }

    setMode(mode: AIMode) {
        this.selectedMode.set(mode);
    }

    copyMessageText(msg: ChatMessage) {
        if (!msg.content) return;
        navigator.clipboard.writeText(msg.content).then(() => {
            this.copiedMessageId.set(msg.id);
            setTimeout(() => {
                if (this.copiedMessageId() === msg.id) {
                    this.copiedMessageId.set(null);
                }
            }, 2000);
        }).catch(() => {});
    }

    /* ----------------------------------------------------
       Action Execution Handler
    ---------------------------------------------------- */
    executeAction(action: ChatAction, messageContext?: ChatMessage) {
        if (!action) return;

        if (action.action_type === 'SCAN_ADMISSION' || action.label?.toLowerCase().includes('scan admission')) {
            this.triggerAdmissionScan();
            return;
        }

        if (action.action_type === 'PRINT_DOCUMENT' || action.label?.toLowerCase().includes('print')) {
            const docType = action.payload?.docType || messageContext?.printableDoc?.type || 'generic';
            const title = action.payload?.title || messageContext?.printableDoc?.title || 'Institutional Document';
            const content = messageContext?.content || '';
            this.printOrExportDocument(docType, title, content);
            return;
        }

        if (action.action_type === 'TRIGGER_SMS_BROADCAST' || action.label?.toLowerCase().includes('sms')) {
            const defaultMsg = typeof action.payload === 'string' ? action.payload : (action.payload?.message || messageContext?.content || '');
            this.openSmsBroadcastModal(defaultMsg);
            return;
        }

        if (action.action_type === 'TRIGGER_ROLLCALL_MODAL' || action.label?.toLowerCase().includes('roll-call')) {
            this.openRollCallModal();
            return;
        }

        if (action.action_type === 'NAVIGATE') {
            const url = typeof action.payload === 'string' ? action.payload : action.payload?.url;
            if (url) {
                this.router.navigateByUrl(url);
                if (!this.isExpanded()) {
                    this.isOpen.set(false);
                }
            }
        } else if (action.action_type === 'SEND_PROMPT') {
            const prompt = typeof action.payload === 'string' ? action.payload : action.payload?.prompt;
            if (prompt) {
                this.sendQuickPrompt(prompt);
            }
        } else if (action.action_type === 'EXPORT_CSV') {
            this.exportToCsv(action.payload);
        } else if (action.action_type === 'GENERATE_PDF') {
            const url = action.payload?.url || '/reports';
            this.router.navigateByUrl(url);
        }
    }

    private exportToCsv(payload: any) {
        const rows: any[] = Array.isArray(payload) ? payload : (payload?.data || []);
        if (!rows || rows.length === 0) {
            this.toast.error('No export data found.');
            return;
        }

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row =>
                headers.map(fieldName => JSON.stringify(row[fieldName] ?? '', (key, value) => (value === null ? '' : value))).join(',')
            ),
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `school_intelligence_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /* ----------------------------------------------------
       Printable PDF / Document Exporter Engine
    ---------------------------------------------------- */
    printOrExportDocument(docType: 'exam' | 'lesson' | 'letter' | 'generic', title: string, rawContent: string) {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            this.toast.error('Please allow popups to print / export document.');
            return;
        }

        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const formattedHtml = this.formatContent(rawContent);

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title} - SchoolLinx Intelligence</title>
    <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
        .header p { margin: 2px 0 0 0; font-size: 11px; color: #64748b; }
        .doc-badge { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; border: 1px solid #bfdbfe; }
        .candidate-box { border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; display: flex; justify-content: space-between; }
        .content { font-size: 13px; }
        .content h2, .content h3, .content h4 { color: #0f172a; margin-top: 18px; margin-bottom: 6px; }
        .content table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; }
        .content th, .content td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        .content th { background: #f1f5f9; font-weight: bold; }
        .content pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 11px; }
        .content blockquote { border-left: 3px solid #3b82f6; padding-left: 10px; color: #475569; font-style: italic; margin: 10px 0; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        .signature-grid { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
        .sig-line { width: 200px; border-top: 1px solid #475569; text-align: center; font-size: 11px; padding-top: 4px; color: #475569; }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>SCHOOLLINX ACADEMIC INTELLIGENCE</h1>
            <p>Official Institutional Record & Assessment System • Date: ${dateStr}</p>
        </div>
        <div class="doc-badge">${title}</div>
    </div>

    ${docType === 'exam' ? `
    <div class="candidate-box">
        <div><strong>Student Name:</strong> ________________________________</div>
        <div><strong>Class / Grade:</strong> ________________</div>
        <div><strong>Score:</strong> ______ / 100</div>
    </div>
    ` : ''}

    <div class="content">
        ${formattedHtml}
    </div>

    <div class="signature-grid">
        <div class="sig-line">Instructor / Teacher Signature</div>
        <div class="sig-line">Principal / Academic Head</div>
    </div>

    <div class="footer">
        <div>SchoolLinx AI Verified Document</div>
        <div>Page 1 of 1</div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
`;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }

    /* ----------------------------------------------------
       Continuous Two-Way Voice Mode
    ---------------------------------------------------- */
    toggleTwoWayVoiceMode() {
        const next = !this.isTwoWayVoiceMode();
        this.isTwoWayVoiceMode.set(next);

        if (next) {
            this.playChime();
            this.toast.info('Continuous Two-Way Voice Mode active. AI will listen and speak hands-free.');
            this.startVoiceInput();
        } else {
            this.stopSpeechSynthesis();
            this.stopVoiceInput();
            this.toast.info('Two-Way Voice Mode ended.');
        }
    }

    /* ----------------------------------------------------
       One-Click SMS Broadcast Modal Handlers
    ---------------------------------------------------- */
    getSmsPageCount(): number {
        const len = this.smsMessageDraft().length;
        if (len <= 160) return 1;
        return Math.ceil(len / 153);
    }

    openSmsBroadcastModal(defaultMessage: string = '', defaultTarget: string = 'ALL_PARENTS') {
        this.smsMessageDraft.set(defaultMessage);
        this.smsTargetAudience.set(defaultTarget);
        this.isSmsBroadcastModalOpen.set(true);
    }

    closeSmsBroadcastModal() {
        this.isSmsBroadcastModalOpen.set(false);
    }

    sendSmsBroadcast() {
        const msg = this.smsMessageDraft().trim();
        if (!msg) {
            this.toast.warning('Please enter message text to broadcast.');
            return;
        }

        this.isSendingSms.set(true);
        this.communicationService.sendUrgentSMS({
            target_audience: this.smsTargetAudience(),
            message: msg,
        }).subscribe({
            next: (res) => {
                this.isSendingSms.set(false);
                this.isSmsBroadcastModalOpen.set(false);
                this.toast.success(res?.message || 'Broadcast SMS dispatched successfully!', 'SMS Dispatched');
                this.playChime();

                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `📢 **Broadcast SMS Dispatched Successfully!**\n\n- **Target Audience:** ${this.smsTargetAudience()}\n- **Content:** "${msg}"\n- **Status:** Queued to Telecom Gateways`,
                        timestamp: new Date(),
                        type: 'text',
                    },
                ]);
            },
            error: (err) => {
                this.isSendingSms.set(false);
                this.toast.error(err?.error?.error || 'Failed to dispatch broadcast SMS. Check SMS balance.');
            },
        });
    }

    /* ----------------------------------------------------
       One-Click Quick Class Roll-Call Automation Handlers
    ---------------------------------------------------- */
    openRollCallModal(classId?: string) {
        const classes = this.availableClasses();
        const initialClassId = classId || (classes.length > 0 ? classes[0].id : '');
        this.selectedRollCallClassId.set(initialClassId);
        this.rollCallDate.set(new Date().toISOString().slice(0, 10));
        this.isRollCallModalOpen.set(true);

        if (initialClassId) {
            this.onRollCallClassSelected(initialClassId);
        }
    }

    closeRollCallModal() {
        this.isRollCallModalOpen.set(false);
    }

    onRollCallClassSelected(classId: string) {
        this.selectedRollCallClassId.set(classId);
        if (!classId) return;

        this.isLoadingRollCallStudents.set(true);
        this.studentService.getStudentsByClass(classId).subscribe({
            next: students => {
                this.isLoadingRollCallStudents.set(false);
                const list = students || [];
                this.rollCallStudents.set(list);

                const map: { [id: string]: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' } = {};
                list.forEach(s => {
                    if (s.id) map[s.id] = 'PRESENT';
                });
                this.rollCallStatusMap.set(map);
            },
            error: () => {
                this.isLoadingRollCallStudents.set(false);
                this.rollCallStudents.set([]);
            },
        });
    }

    setStudentRollCallStatus(studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') {
        this.rollCallStatusMap.update(m => ({ ...m, [studentId]: status }));
    }

    markAllRollCall(status: 'PRESENT' | 'ABSENT') {
        const current = { ...this.rollCallStatusMap() };
        Object.keys(current).forEach(id => current[id] = status);
        this.rollCallStatusMap.set(current);
    }

    saveRollCall() {
        const classId = this.selectedRollCallClassId();
        const date = this.rollCallDate();
        const students = this.rollCallStudents();
        const map = this.rollCallStatusMap();

        if (!classId || students.length === 0) {
            this.toast.warning('No students to record attendance for.');
            return;
        }

        this.isSavingRollCall.set(true);

        const attendances: Attendance[] = students.map(s => {
            const rawStatus = map[s.id || ''];
            let status: AttendanceStatus = 'Present';
            if (rawStatus === 'ABSENT') status = 'Absent';
            else if (rawStatus === 'LATE') status = 'Tardy';

            return {
                student_id: s.id || '',
                class_id: classId,
                date: date,
                status: status,
            };
        });

        this.attendanceService.markBulkAttendance(attendances).subscribe({
            next: () => {
                this.isSavingRollCall.set(false);
                this.isRollCallModalOpen.set(false);
                const presentCount = Object.values(map).filter(v => v === 'PRESENT').length;
                const clsName = this.availableClasses().find(c => c.id === classId)?.name || 'Class';
                this.toast.success(`Attendance saved for ${clsName} (${presentCount}/${students.length} Present)`);
                this.playChime();

                this.messages.update(msgs => [
                    ...msgs,
                    {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `✅ **Daily Attendance Recorded for ${clsName}**\n\n- **Date:** ${date}\n- **Total Students:** ${students.length}\n- **Present:** ${presentCount} (${Math.round((presentCount / (students.length || 1)) * 100)}%)\n- **Absent:** ${students.length - presentCount}\n\nAttendance synchronized with school records.`,
                        timestamp: new Date(),
                        type: 'text',
                    },
                ]);
            },
            error: err => {
                this.isSavingRollCall.set(false);
                this.toast.error(err?.error?.error || 'Failed to save class attendance.');
            },
        });
    }

    /* ----------------------------------------------------
       SVG Chart Math & Path Helpers
    ---------------------------------------------------- */
    getMaxValue(data: number[]): number {
        if (!data || data.length === 0) return 100;
        const max = Math.max(...data);
        return max > 0 ? max : 100;
    }

    getSumValue(data: number[]): number {
        if (!data || data.length === 0) return 0;
        return data.reduce((a, b) => a + b, 0);
    }

    getBarHeight(val: number, max: number): number {
        if (max === 0) return 0;
        return Math.min(100, Math.max(4, Math.round((val / max) * 100)));
    }

    getLinePath(data: number[]): string {
        if (!data || data.length < 2) return '';
        const max = this.getMaxValue(data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const width = 320;
        const height = 100;
        const step = width / (data.length - 1);

        return data.map((val, idx) => {
            const x = Math.round(idx * step);
            const normalized = (val - min) / range;
            const y = Math.round(height - normalized * (height - 20) - 10);
            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    }

    getLineAreaPath(data: number[]): string {
        const line = this.getLinePath(data);
        if (!line) return '';
        return `${line} L 320 120 L 0 120 Z`;
    }

    getDonutDashArray(val: number, total: number): string {
        if (!total) return '0 100';
        const pct = Math.round((val / total) * 100);
        return `${pct} ${100 - pct}`;
    }

    getDonutOffset(idx: number, data: number[]): number {
        const total = this.getSumValue(data);
        if (!total || idx === 0) return 25;
        const priorSum = data.slice(0, idx).reduce((a, b) => a + b, 0);
        const priorPct = (priorSum / total) * 100;
        return 25 - priorPct;
    }

    /* ----------------------------------------------------
       Speech-to-Text (STT) Recognition
    ---------------------------------------------------- */
    private initSpeechRecognition() {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
            this.speechRecognitionAvailable.set(true);
            this.recognition = new SpeechRec();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        this.userInput.update(current => (current ? `${current} ${transcript}` : transcript));
                        // In Continuous Two-Way Voice mode, auto-submit when finalized
                        if (this.isTwoWayVoiceMode()) {
                            setTimeout(() => this.sendMessage(), 300);
                        }
                    } else {
                        interimTranscript += transcript;
                    }
                }
            };

            this.recognition.onerror = (event: any) => {
                console.warn('[AI Chatbot] Speech recognition error:', event.error);
                this.isRecording.set(false);
            };

            this.recognition.onend = () => {
                this.isRecording.set(false);
            };
        }
    }

    toggleVoiceInput() {
        if (!this.speechRecognitionAvailable()) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (this.isRecording()) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    private startVoiceInput() {
        try {
            this.recognition?.start();
            this.isRecording.set(true);
        } catch (e) {
            console.warn('[AI Chatbot] Could not start speech recognition:', e);
            this.isRecording.set(false);
        }
    }

    private stopVoiceInput() {
        try {
            this.recognition?.stop();
        } catch (_) {}
        this.isRecording.set(false);
    }

    /* ----------------------------------------------------
       Text-to-Speech (TTS) Synthesis
    ---------------------------------------------------- */
    toggleSpeak(msg: ChatMessage) {
        if (this.isSpeaking() && this.activeSpeakingId() === msg.id) {
            this.stopSpeechSynthesis();
            return;
        }

        this.stopSpeechSynthesis();
        if (!window.speechSynthesis) return;

        // Clean markdown symbols for natural speech
        const cleanText = msg.content
            .replace(/#{1,6}\s?/g, '')
            .replace(/[*_~`>]/g, '')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/\|.*?\|/g, '')
            .replace(/\n+/g, '. ');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';

        utterance.onend = () => {
            this.isSpeaking.set(false);
            this.activeSpeakingId.set(null);
            // In continuous two-way mode, immediately start listening for next turn
            if (this.isTwoWayVoiceMode()) {
                setTimeout(() => this.startVoiceInput(), 400);
            }
        };
        utterance.onerror = () => {
            this.isSpeaking.set(false);
            this.activeSpeakingId.set(null);
        };

        this.isSpeaking.set(true);
        this.activeSpeakingId.set(msg.id);
        window.speechSynthesis.speak(utterance);
    }

    private stopSpeechSynthesis() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.isSpeaking.set(false);
        this.activeSpeakingId.set(null);
    }

    /* ----------------------------------------------------
       Audio Chime Feedback (Web Audio API)
    ---------------------------------------------------- */
    private playChime() {
        if (!this.soundEnabled()) return;
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch (_) {}
    }

    /* ----------------------------------------------------
       Export Chat Transcript
    ---------------------------------------------------- */
    exportChatTranscript() {
        const msgs = this.messages();
        let transcript = `=== SCHOOL INTELLIGENCE AI CHAT TRANSCRIPT ===\nExported on: ${new Date().toLocaleString()}\n\n`;

        msgs.forEach(m => {
            const speaker = m.role === 'user' ? 'USER' : 'SCHOOL INTELLIGENCE AI';
            const time = new Date(m.timestamp).toLocaleTimeString();
            transcript += `[${time}] ${speaker}:\n${m.content}\n\n`;
        });

        const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `intelligence_chat_${new Date().toISOString().slice(0, 10)}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /* ----------------------------------------------------
       Markdown & Rich Format Parser
    ---------------------------------------------------- */
    formatContent(content: string): string {
        if (!content) return '';

        let formatted = content;

        // Escape HTML tags to prevent XSS
        formatted = formatted
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Code blocks: ```language ... ```
        formatted = formatted.replace(/```([\s\S]*?)```/g, (match, p1) => {
            return `<pre class="bg-slate-900/90 text-cyan-300 p-3 my-2 rounded-xl text-xs font-mono overflow-x-auto border border-white/10"><code>${p1.trim()}</code></pre>`;
        });

        // Inline code: `code`
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-xs">$1</code>');

        // Headers: ### Header
        formatted = formatted.replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-cyan-400 mt-2.5 mb-1">$1</h4>');
        formatted = formatted.replace(/^## (.*$)/gim, '<h3 class="text-base font-bold text-indigo-300 mt-3 mb-1.5">$1</h3>');
        formatted = formatted.replace(/^# (.*$)/gim, '<h2 class="text-lg font-black text-white mt-3 mb-2">$1</h2>');

        // Blockquotes: > Quote
        formatted = formatted.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-500 pl-3 py-1 my-2 bg-indigo-500/10 rounded-r-lg text-xs italic text-text-primary/90">$1</blockquote>');

        // Markdown Tables: | col | col |
        formatted = formatted.replace(/((?:\|[^\n]+\|\r?\n?)+)/g, match => {
            const lines = match.trim().split('\n').filter(l => l.trim().length > 0);
            if (lines.length < 2) return match;

            let html = '<div class="overflow-x-auto my-3 rounded-xl border border-white/10"><table class="w-full text-left text-xs border-collapse">';
            let isHeader = true;

            lines.forEach((line, index) => {
                if (line.includes('---')) {
                    isHeader = false;
                    return;
                }
                const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
                if (cells.length === 0) return;

                if (isHeader && index === 0) {
                    html += '<thead class="bg-white/10 text-text-primary font-bold"><tr>';
                    cells.forEach(c => html += `<th class="p-2 border-b border-white/10">${c.trim()}</th>`);
                    html += '</tr></thead><tbody>';
                } else {
                    html += '<tr class="border-b border-white/5 hover:bg-white/5">';
                    cells.forEach(c => html += `<td class="p-2 text-text-primary/90">${c.trim()}</td>`);
                    html += '</tr>';
                }
            });

            html += '</tbody></table></div>';
            return html;
        });

        // Bold: **text**
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-text-primary">$1</strong>');

        // Italic: *text*
        formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

        // Bullet lists: - item or • item
        formatted = formatted.replace(/^[•\-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-xs text-text-primary/90 leading-relaxed">$1</li>');

        // Newlines to break (outside table/pre blocks)
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    private scrollToBottom() {
        try {
            if (this.messageContainer) {
                this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
            }
        } catch (_) {}
    }
}
