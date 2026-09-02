import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-for-principals',
  imports: [RouterModule],
  templateUrl: './for-principals.html',
  styleUrl: './for-principals.css'
})
export class ForPrincipals implements OnInit {
  constructor(private meta: Meta, private title: Title) {}
  ngOnInit() {
    this.title.setTitle('School Linx for Principals & Headteachers');
    this.meta.updateTag({ name: 'description', content: 'Give principals a real-time command centre. Track KPIs, manage staff, oversee academics and fees — all from one executive dashboard.' });
  }
}
