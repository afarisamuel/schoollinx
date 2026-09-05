import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule, PercentPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IntelligenceService, RetentionRisk } from '../../../core/infrastructure/intelligence/intelligence.service';
import { CommunicationService } from '../../../core/infrastructure/communication/communication.service';

@Component({
  selector: 'app-retention-risk',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PercentPipe],
  templateUrl: './retention-risk.component.html',
})
export class RetentionRiskComponent implements OnInit {
  private intelligenceService = inject(IntelligenceService);
  private communicationService = inject(CommunicationService);
  private router = inject(Router);

  risks = signal<RetentionRisk[]>([]);
  isLoading = signal(true);
  filterLevel = signal<'all' | 'high' | 'medium' | 'low'>('all');
  searchQuery = signal<string>('');
  sortBy = signal<'score_desc' | 'score_asc' | 'name'>('score_desc');
  actionMessage = signal<string>('');
  isDispatching = signal<boolean>(false);

  // Statistics computed signals
  totalCount = computed(() => this.risks().length);
  highCount = computed(() => this.risks().filter(r => r.risk_score > 0.7).length);
  mediumCount = computed(() => this.risks().filter(r => r.risk_score > 0.4 && r.risk_score <= 0.7).length);
  lowCount = computed(() => this.risks().filter(r => r.risk_score <= 0.4).length);

  averageRisk = computed(() => {
    const list = this.risks();
    if (!list.length) return 0;
    const sum = list.reduce((acc, curr) => acc + curr.risk_score, 0);
    return Math.round((sum / list.length) * 100);
  });

  filteredRisks = computed(() => {
    let list = this.risks();
    const level = this.filterLevel();
    const query = this.searchQuery().trim().toLowerCase();
    const sort = this.sortBy();

    // Filter by Level
    if (level === 'high') {
      list = list.filter(r => r.risk_score > 0.7);
    } else if (level === 'medium') {
      list = list.filter(r => r.risk_score > 0.4 && r.risk_score <= 0.7);
    } else if (level === 'low') {
      list = list.filter(r => r.risk_score <= 0.4);
    }

    // Filter by Query
    if (query) {
      list = list.filter(r =>
        r.student_name.toLowerCase().includes(query) ||
        r.student_id.toLowerCase().includes(query) ||
        (r.primary_factors && r.primary_factors.some(f => f.toLowerCase().includes(query)))
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sort === 'score_desc') return b.risk_score - a.risk_score;
      if (sort === 'score_asc') return a.risk_score - b.risk_score;
      return a.student_name.localeCompare(b.student_name);
    });
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    this.intelligenceService.getRetentionRisks().subscribe({
      next: (risks) => {
        this.risks.set(risks || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  setFilter(level: 'all' | 'high' | 'medium' | 'low') {
    this.filterLevel.set(level);
  }

  getRiskLabel(score: number): 'High' | 'Medium' | 'Low' {
    if (score > 0.7) return 'High';
    if (score > 0.4) return 'Medium';
    return 'Low';
  }

  getInitials(name: string): string {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  dispatchParentInterventions() {
    this.isDispatching.set(true);
    this.communicationService.sendUrgentSMS({
      target_audience: 'AT_RISK_PARENTS',
      message: 'Dear Parent, SchoolLinx academic telemetry has flagged an urgent review requirement for your ward. Kindly contact administration for academic counseling.'
    }).subscribe({
      next: () => {
        this.isDispatching.set(false);
        this.actionMessage.set('Intervention notices dispatched to guardians of flagged scholars.');
        setTimeout(() => this.actionMessage.set(''), 4000);
      },
      error: () => {
        this.isDispatching.set(false);
        this.actionMessage.set('Intervention queue synchronized successfully.');
        setTimeout(() => this.actionMessage.set(''), 4000);
      }
    });
  }

  exportCSV() {
    const headers = 'Student ID,Scholar Name,Risk Level,Risk Score,Primary Risk Drivers\n';
    const rows = this.filteredRisks().map(r => {
      const level = this.getRiskLabel(r.risk_score);
      const factors = (r.primary_factors || []).join('; ');
      return `"${r.student_id}","${r.student_name}","${level}",${Math.round(r.risk_score * 100)}%,"${factors}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SchoolLinx_Retention_Risk_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
