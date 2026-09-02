import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollReveal } from '../../shared/directives/scroll-reveal';
import { SeoService } from '../../shared/services/seo';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollReveal],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  currentYear = new Date().getFullYear();
  openFaqIndex = signal<number | null>(0);

  constructor(private seo: SeoService) {}

  ngOnInit() {
    this.seo.updateMeta(
      'School Linx — Institutional School Operating System',
      'Unified institutional platform for African schools. Real-time academics, biometric attendance, speed gradebooks, parent SMS, and automated fee collections.',
      '/'
    );
  }

  toggleFaq(index: number) {
    this.openFaqIndex.update(current => (current === index ? null : index));
  }

  // Section 3: Impact Stats
  keyStats = [
    { value: '150,000+', label: 'Active Students Enrolled', detail: 'Across 500+ primary, secondary & international institutions' },
    { value: '99.4%', label: 'Fee Collection Rate', detail: 'Automated invoice schedules and parent SMS reminders' },
    { value: '18 hrs', label: 'Saved Weekly per Faculty', detail: 'Automated grade averaging, report cards & master timetables' },
    { value: '99.99%', label: 'Guaranteed Cloud SLA', detail: 'Fully isolated databases with redundant automated daily backups' }
  ];

  // Section 4: Ecosystem Pillars
  ecosystemPillars = [
    {
      icon: 'fa-id-card',
      title: 'Student 360 & Admissions',
      desc: 'Centralized registry tracking admission documents, health profiles, guardians, and academic milestones from enrollment to graduation.'
    },
    {
      icon: 'fa-chalkboard-teacher',
      title: 'Faculty & Speed Gradebook',
      desc: 'Weighted multi-component evaluations, automated conduct remarks, one-click roll-call, and curriculum scheme planning.'
    },
    {
      icon: 'fa-calculator',
      title: 'Fiscal & Fee Governance',
      desc: 'Automatic tuition invoicing, POS receipt generation, debtor ledger tracking, and multi-channel payment reconciliation.'
    },
    {
      icon: 'fa-comments',
      title: 'Parent Comms & SMS Engine',
      desc: 'Multi-carrier telco routing for real-time absenteeism alerts, terminal report card dispatches, and emergency broadcasts.'
    }
  ];

  // Section 20: Comparison Table
  comparisonItems = [
    { feature: 'Multi-Tenant Database Isolation', schoolLinx: 'Dedicated Physical & Logical Schema', legacy: 'Shared / Insecure Spreadsheets' },
    { feature: 'Weighted Speed Gradebook', schoolLinx: 'Instant Dynamic Auto-Computation', legacy: 'Manual Excel Formulas & Errors' },
    { feature: 'Automated Master Timetable Engine', schoolLinx: 'Conflict-Free Constraint Solver', legacy: 'Days of Manual Paper Drafting' },
    { feature: 'Multi-Carrier SMS Gateways', schoolLinx: 'Native Telco Delivery with Delivery Reports', legacy: 'Unreliable Manual Group Texts' },
    { feature: 'Parent & Student Portal Access', schoolLinx: 'Real-Time Web & PWA Portals', legacy: 'Paper Printouts & Manual Enquiries' },
    { feature: 'Biometric & Terminal Telemetry', schoolLinx: 'Live Facial, RFID & Fingerprint Sync', legacy: 'Paper Logbooks & Delayed Registers' },
    { feature: 'Financial Audit & Debt Tracking', schoolLinx: 'Real-time Ledgers & Automated Invoicing', legacy: 'Unreconciled Bank Slips & Lost Records' }
  ];

  // Section 21: Testimonials
  testimonials = [
    {
      name: 'Dr. Kwame Boateng',
      role: 'Headmaster, Ridge International School',
      quote: 'School Linx eliminated our 3-week end-of-term grading bottleneck. Our teachers enter scores in seconds, and parents receive PDF report cards directly on their phones.',
      location: 'Accra, Ghana',
      metric: '98% On-Time Report Cards'
    },
    {
      name: 'Mrs. Folashade Adeyemi',
      role: 'Principal, Greenfield Crest Academy',
      quote: 'The fiscal intelligence engine transformed our tuition collection. Automated SMS payment reminders alone recovered over 95% of outstanding fees in the first term.',
      location: 'Lagos, Nigeria',
      metric: '40% Bad Debt Reduction'
    },
    {
      name: 'Mr. Emmanuel Mensah',
      role: 'Director of ICT, St. Andrews College',
      quote: 'Generating timetables used to take an entire committee two weeks before each academic term. With School Linx, our conflict-free timetable was generated and published in 20 minutes.',
      location: 'Kumasi, Ghana',
      metric: '90% Timetable Prep Saved'
    }
  ];

  // Section 22: FAQ Items
  faqs = [
    {
      question: 'How does School Linx ensure our student records and financials remain completely secure?',
      answer: 'Every school operating on School Linx receives a dedicated, logically and physically isolated tenant database. All sensitive data is encrypted at rest using AES-256 and transmitted exclusively over TLS 1.3. Role-Based Access Control (RBAC) ensures administrators, teachers, and accountants only access designated modules.'
    },
    {
      question: 'Can we import our existing student, teacher, and subject records from Excel or CSV files?',
      answer: 'Yes. School Linx provides built-in 1-click batch import tools with automatic validation. Our white-glove onboarding specialists assist with schema mapping, student photo linking, and historical grade uploads to ensure zero downtime during transition.'
    },
    {
      question: 'How does the weighted Speed Gradebook calculate custom continuous assessment formulas?',
      answer: 'Administrators or headmasters define custom weighting splits (e.g., 20% Homework, 30% Mid-Term, 50% Terminal Exam) per class or school-wide. As teachers enter raw scores out of 100, the system automatically computes weighted totals, assigns letter grades (A–F), and updates class averages in real time.'
    },
    {
      question: 'Do parents need to download an application to receive fees, attendance, and report cards?',
      answer: 'No app download is required. Parents receive instant SMS notifications with secure access links. In addition, parents can log in to the responsive web portal or install the lightweight Progressive Web App (PWA) on any smartphone with zero app store delays.'
    },
    {
      question: 'Can School Linx handle multi-branch school networks and multi-term academic years?',
      answer: 'Yes. School Linx natively supports multi-branch governance, multi-curriculum divisions (e.g. Basic, JHS, SHS, Cambridge, IB), and multi-term academic period transitions with automated student advancement and roll-over.'
    },
    {
      question: 'What hardware is required for biometric attendance and roll-call?',
      answer: 'School Linx integrates seamlessly with standard RFID card scanners, fingerprint terminals, and camera-based facial recognition stations over standard web telemetry APIs, while also providing teachers with rapid digital roll-call on any phone or tablet.'
    }
  ];
}
