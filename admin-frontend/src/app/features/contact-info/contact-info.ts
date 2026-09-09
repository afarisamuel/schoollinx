import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactInfoService, CompanyContactInfo } from '../../core/services/contact-info.service';

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-info.html'
})
export class ContactInfoComponent implements OnInit {
  private contactService = inject(ContactInfoService);

  isLoading = signal(true);
  isSaving = signal(false);
  activeTab = signal<'channels' | 'phone' | 'locations' | 'social'>('channels');

  feedbackMsg = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  form = signal<CompanyContactInfo>({
    sales_email: 'sales@schoollinx.com',
    sales_title: 'Institutional Sales',
    sales_desc: 'Discuss school migration, pricing tiers & demos.',
    support_email: 'support@schoollinx.com',
    support_title: 'Technical Support Concierge',
    support_desc: 'Assistance for headmasters, ICT coordinators & bursars.',
    general_email: 'info@schoollinx.com',
    dpo_email: 'privacy@schoollinx.com',
    primary_phone: '+233 24 412 3456',
    phone_title: 'Direct Telephone & WhatsApp',
    operating_hours: 'Monday to Friday, 8:00 AM – 5:00 PM GMT',
    whatsapp_number: '+233244123456',
    emergency_hotline: '+233 20 000 1122',
    headquarters_title: 'Regional Headquarters',
    headquarters_subtitle: 'West Africa Technology Innovation Hub',
    headquarters_address: 'Accra • Lagos • Nairobi',
    full_address: '12 Independence Avenue, Ridge, Accra, Ghana',
    twitter_url: 'https://twitter.com',
    linkedin_url: 'https://linkedin.com',
    github_url: 'https://github.com',
    youtube_url: 'https://youtube.com',
    facebook_url: 'https://facebook.com'
  });

  ngOnInit() {
    this.loadInfo();
  }

  loadInfo() {
    this.isLoading.set(true);
    this.contactService.getContactInfo().subscribe({
      next: (data) => {
        if (data) {
          this.form.set({ ...this.form(), ...data });
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showFeedback('Failed to load contact info: ' + (err.error?.error || err.message), 'error');
        this.isLoading.set(false);
      }
    });
  }

  save() {
    this.isSaving.set(true);
    this.contactService.updateContactInfo(this.form()).subscribe({
      next: (saved) => {
        this.form.set(saved);
        this.isSaving.set(false);
        this.showFeedback('Contact information updated successfully! Public page updated.', 'success');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showFeedback('Update failed: ' + (err.error?.error || err.message), 'error');
      }
    });
  }

  openPublicPreview() {
    window.open('http://localhost:4200/contact', '_blank');
  }

  showFeedback(text: string, type: 'success' | 'error') {
    this.feedbackMsg.set({ text, type });
    setTimeout(() => {
      this.feedbackMsg.set(null);
    }, 4000);
  }
}
