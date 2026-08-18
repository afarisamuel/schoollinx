import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-case-studies',
  imports: [RouterModule],
  templateUrl: './case-studies.html',
  styleUrl: './case-studies.css',
})
export class CaseStudies implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Success Stories & Case Studies | School Linx');
    this.meta.updateTag({ name: 'description', content: 'See how 500+ schools across Africa are transforming their operations with School Linx. Real results, real metrics, real schools.' });
  }
}
