import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FiscalService, FinancialRecommendation } from '../../../core/infrastructure/fiscal/fiscal.service';

@Component({
  selector: 'app-fiscal-intelligence',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fiscal-intelligence.component.html'
})
export class FiscalIntelligenceComponent implements OnInit {
  private fiscalService = inject(FiscalService);
  
  recommendations = signal<FinancialRecommendation[]>([]);

  ngOnInit() {
    this.loadRecommendations();
  }

  loadRecommendations() {
    this.fiscalService.getRecommendations().subscribe({
      next: (data) => this.recommendations.set(data),
      error: (err) => console.error('Failed to load recommendations:', err)
    });
  }
}
