import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegalPagesService, LegalPage, LegalPageUpsertDto } from '../../core/services/legal-pages.service';

@Component({
  selector: 'app-legal-pages',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './legal-pages.html'
})
export class LegalPagesComponent implements OnInit {
  private legalService = inject(LegalPagesService);

  pages = signal<LegalPage[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  selectedCategory = signal<'ALL' | string>('ALL');

  // Modal / Editor State
  isEditorOpen = signal(false);
  isSaving = signal(false);
  activeTab = signal<'edit' | 'preview'>('edit');
  editingId = signal<string | null>(null);

  // Form Model
  formModel = signal<LegalPageUpsertDto>({
    slug: '',
    title: '',
    category: 'Privacy & Compliance',
    summary: '',
    content: '',
    version: '1.0',
    is_published: true,
    effective_date: new Date().toISOString().split('T')[0],
    last_updated_by: 'SuperAdmin'
  });

  // Action status indicators
  actionLoadingId = signal<string | null>(null);
  feedbackMsg = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // Computed Categories
  categories = computed(() => {
    const list = this.pages();
    const set = new Set<string>();
    list.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  });

  // Filtered pages
  filteredPages = computed(() => {
    let result = this.pages();
    const cat = this.selectedCategory();
    const q = this.searchQuery().toLowerCase().trim();

    if (cat !== 'ALL') {
      result = result.filter(p => p.category === cat);
    }

    if (q) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.summary && p.summary.toLowerCase().includes(q))
      );
    }

    return result;
  });

  // Metrics
  totalCount = computed(() => this.pages().length);
  publishedCount = computed(() => this.pages().filter(p => p.is_published).length);
  draftCount = computed(() => this.pages().filter(p => !p.is_published).length);

  ngOnInit() {
    this.loadPages();
  }

  loadPages() {
    this.isLoading.set(true);
    this.legalService.getLegalPages().subscribe({
      next: (data) => {
        this.pages.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showFeedback('Failed to load legal pages: ' + (err.error?.error || err.message), 'error');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal() {
    this.editingId.set(null);
    this.formModel.set({
      slug: '',
      title: '',
      category: 'Privacy & Compliance',
      summary: '',
      content: '## 1. Overview\n\nProvide the policy scope and institutional commitments here.\n\n---\n\n## 2. Key Terms\n\n- **Item A**: Details here.\n- **Item B**: Details here.',
      version: '1.0',
      is_published: true,
      effective_date: new Date().toISOString().split('T')[0],
      last_updated_by: 'SuperAdmin'
    });
    this.activeTab.set('edit');
    this.isEditorOpen.set(true);
  }

  openEditModal(page: LegalPage) {
    this.editingId.set(page.id);
    let effDate = page.effective_date ? page.effective_date.split('T')[0] : new Date().toISOString().split('T')[0];
    this.formModel.set({
      slug: page.slug,
      title: page.title,
      category: page.category || 'General',
      summary: page.summary || '',
      content: page.content || '',
      version: page.version || '1.0',
      is_published: page.is_published,
      effective_date: effDate,
      last_updated_by: page.last_updated_by || 'SuperAdmin'
    });
    this.activeTab.set('edit');
    this.isEditorOpen.set(true);
  }

  closeModal() {
    this.isEditorOpen.set(false);
    this.editingId.set(null);
  }

  onTitleChange(title: string) {
    if (!this.editingId()) {
      // Auto-generate slug for new pages if not manually set
      const autoSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      this.formModel.update(m => ({ ...m, title, slug: autoSlug }));
    } else {
      this.formModel.update(m => ({ ...m, title }));
    }
  }

  bumpVersion(increment: number) {
    const current = parseFloat(this.formModel().version || '1.0');
    if (isNaN(current)) {
      this.formModel.update(m => ({ ...m, version: '1.1' }));
    } else {
      const next = (current + increment).toFixed(1);
      this.formModel.update(m => ({ ...m, version: next }));
    }
  }

  insertTemplate(type: 'privacy' | 'terms' | 'cookie' | 'sla' | 'dpa') {
    let tpl = '';
    let defaultTitle = '';
    let defaultCat = '';

    switch (type) {
      case 'privacy':
        defaultTitle = 'Privacy Policy & Student Data Protection';
        defaultCat = 'Privacy & Compliance';
        tpl = `## 1. Scope & Dedicated Tenant Isolation\n\nSchoolLinx processes student and institutional records within cryptographically isolated tenant schemas.\n\n---\n\n## 2. Information Collected\n\n- Academic Records (Grades, Attendance, Continuous Assessments)\n- Parent & Guardian Contact Metadata\n- Fee Invoices and Verification Tokens\n\n---\n\n## 3. Data Protection & Security Controls\n\n- AES-256 cloud encryption at rest\n- TLS 1.3 encryption in transit\n- Multi-Carrier SMS gateway log security`;
        break;
      case 'terms':
        defaultTitle = 'Institutional Terms of Service';
        defaultCat = 'Terms & Conditions';
        tpl = `## 1. Acceptance of Terms\n\nBy subscribing to SchoolLinx, the educational institution agrees to these operating terms.\n\n---\n\n## 2. 99.99% Uptime Commitment\n\nSchoolLinx provides high-availability SLA uptime across school operations.\n\n---\n\n## 3. Billing & Payment Schedule\n\nSubscriptions are billed per student per academic term.`;
        break;
      case 'cookie':
        defaultTitle = 'Cookie & Session Tracking Policy';
        defaultCat = 'Privacy & Compliance';
        tpl = `## 1. Essential Authentication Tokens\n\n- **jwt_session**: Authenticates active teacher and administrator sessions.\n- **tenant_subdomain**: Routes user queries to their school database.\n\n---\n\n## 2. Preference Cookies\n\n- **theme_preference**: Stores Light / Dark mode settings.`;
        break;
      case 'sla':
        defaultTitle = 'Service Level Agreement (SLA)';
        defaultCat = 'Security & Compliance';
        tpl = `## 1. Service Availability Guarantee\n\nGuaranteed monthly availability of 99.99% with geo-redundant database failover.\n\n---\n\n## 2. Incident Response Tiers\n\n- **P1 Critical (School Outage)**: < 15 minute engineer response\n- **P2 Major Feature**: < 2 hours response\n- **P3 General Support**: < 24 hours response`;
        break;
      case 'dpa':
        defaultTitle = 'Data Processing Addendum (GDPR / DPA)';
        defaultCat = 'Privacy & Compliance';
        tpl = `## 1. Data Processing Agreement (DPA)\n\nThis Addendum governs the processing of Personal Data in compliance with GDPR and National Data Protection laws.\n\n---\n\n## 2. Customer as Data Controller\n\nThe School remains the sole Data Controller. SchoolLinx acts exclusively as Data Processor.`;
        break;
    }

    this.formModel.update(m => ({
      ...m,
      title: m.title || defaultTitle,
      category: m.category || defaultCat,
      content: tpl
    }));
    if (!this.editingId() && defaultTitle) {
      this.onTitleChange(defaultTitle);
    }
  }

  insertFormatting(prefix: string, suffix: string = '') {
    const textarea = document.getElementById('policyContentArea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = this.formModel().content;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    this.formModel.update(m => ({ ...m, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 0);
  }

  savePage() {
    const form = this.formModel();
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      this.showFeedback('Title, Slug, and Content are required.', 'error');
      return;
    }

    this.isSaving.set(true);
    const id = this.editingId();

    if (id) {
      this.legalService.updateLegalPage(id, form).subscribe({
        next: (updated) => {
          this.pages.update(list => list.map(p => p.id === id ? updated : p));
          this.isSaving.set(false);
          this.closeModal();
          this.showFeedback('Legal page updated successfully', 'success');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showFeedback('Update failed: ' + (err.error?.error || err.message), 'error');
        }
      });
    } else {
      this.legalService.createLegalPage(form).subscribe({
        next: (created) => {
          this.pages.update(list => [created, ...list]);
          this.isSaving.set(false);
          this.closeModal();
          this.showFeedback('Legal page created successfully', 'success');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.showFeedback('Creation failed: ' + (err.error?.error || err.message), 'error');
        }
      });
    }
  }

  togglePublish(page: LegalPage, event?: Event) {
    if (event) event.stopPropagation();
    this.actionLoadingId.set(page.id);

    this.legalService.togglePublish(page.id).subscribe({
      next: (res) => {
        this.pages.update(list =>
          list.map(p => p.id === page.id ? { ...p, is_published: res.is_published } : p)
        );
        this.actionLoadingId.set(null);
        this.showFeedback(`Policy ${res.is_published ? 'Published' : 'Unpublished'}`, 'success');
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        this.showFeedback('Failed to toggle status: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  deletePage(page: LegalPage, event?: Event) {
    if (event) event.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${page.title}" (${page.slug})?`)) return;

    this.actionLoadingId.set(page.id);
    this.legalService.deleteLegalPage(page.id).subscribe({
      next: () => {
        this.pages.update(list => list.filter(p => p.id !== page.id));
        this.actionLoadingId.set(null);
        this.showFeedback('Policy deleted successfully', 'success');
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        this.showFeedback('Delete failed: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  getPublicUrl(slug: string): string {
    return `/legal/${slug}`;
  }

  openPublicPreview(slug: string, event?: Event) {
    if (event) event.stopPropagation();
    const url = `http://localhost:4200/legal/${slug}`;
    window.open(url, '_blank');
  }

  showFeedback(text: string, type: 'success' | 'error') {
    this.feedbackMsg.set({ text, type });
    setTimeout(() => {
      this.feedbackMsg.set(null);
    }, 4000);
  }

  // Simple Markdown parser for instant preview
  renderPreview(markdown: string): string {
    if (!markdown) return '<p class="text-slate-400 italic">No content written yet...</p>';

    let html = markdown
      // Escape script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-800 dark:text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-900 dark:text-white mt-6 mb-3 pb-1 border-b border-slate-200 dark:border-border-primary">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-4">$1</h1>')
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Dividers
      .replace(/^---$/gim, '<hr class="my-6 border-slate-200 dark:border-border-primary" />')
      // Code blocks
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-bg-primary text-teal-600 dark:text-teal-400 font-mono text-xs">$1</code>')
      // Unordered lists
      .replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 dark:text-text-secondary my-1">$1</li>')
      // Paragraphs
      .replace(/\n\n+/g, '</p><p class="my-3 text-slate-700 dark:text-text-secondary leading-relaxed">');

    return `<div class="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-text-secondary leading-relaxed"><p class="my-3">${html}</p></div>`;
  }
}
