import { Component, signal, OnInit } from '@angular/core';
import { PageHeroComponent, PageHeroConfig } from '../../../shared/components/page-hero/page-hero.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface CompanyContactInfo {
    sales_email: string;
    sales_title: string;
    sales_desc: string;
    support_email: string;
    support_title: string;
    support_desc: string;
    general_email: string;
    dpo_email: string;
    primary_phone: string;
    phone_title: string;
    operating_hours: string;
    whatsapp_number: string;
    emergency_hotline: string;
    headquarters_title: string;
    headquarters_subtitle: string;
    headquarters_address: string;
    full_address: string;
    twitter_url: string;
    linkedin_url: string;
    github_url: string;
    youtube_url: string;
    facebook_url: string;
}

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule, PageHeroComponent],
    templateUrl: './contact.component.html',
    styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit {
    submitted = false;
    isSubmitting = signal(false);
    errorMessage = signal('');

    contactInfo = signal<CompanyContactInfo>({
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

    form = signal({
        full_name: '',
        work_email: '',
        school_name: '',
        message: ''
    });

    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.http.get<CompanyContactInfo>(`${environment.apiUrl}/public/contact-info`).subscribe({
            next: (data) => {
                if (data) {
                    this.contactInfo.set({ ...this.contactInfo(), ...data });
                }
            },
            error: () => {}
        });
    }

    onSubmit(e: Event) {
        e.preventDefault();
        const data = this.form();
        if (!data.full_name || !data.work_email || !data.school_name) {
            this.errorMessage.set('Please fill in all required fields.');
            return;
        }
        this.isSubmitting.set(true);
        this.errorMessage.set('');

        this.http.post(`${environment.apiUrl}/public/contact`, data).subscribe({
            next: () => {
                this.submitted = true;
                this.isSubmitting.set(false);
            },
            error: (err) => {
                this.errorMessage.set(err?.error?.error || 'Something went wrong. Please try again.');
                this.isSubmitting.set(false);
            }
        });
    }

    resetForm() {
        this.submitted = false;
        this.form.set({ full_name: '', work_email: '', school_name: '', message: '' });
        this.errorMessage.set('');
    }

    heroConfig: PageHeroConfig = {
        badge: { icon: 'fa-headset', label: 'Institutional Support & Sales' },
        heading: `We're Here to Support Your <span class="ph-accent">School's Mission</span>.`,
        subtitle: `Whether you are evaluating School Linx for a single primary school or a nationwide educational network, our technical specialists are ready to help.`,
        image: 'assets/hero-slide-3.jpg',
        overlayColor: 'rgba(30,10,40,0.82)',
        ctaPrimary: { label: 'Talk to Sales', route: '/contact' },
    };
}
