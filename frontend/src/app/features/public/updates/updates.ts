import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-updates',
  imports: [],
  templateUrl: './updates.html',
  styleUrl: './updates.css',
})
export class Updates implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Product Changelog | School Linx — What\'s New');
    this.meta.updateTag({ name: 'description', content: 'Follow every new feature, improvement, and fix shipped by the School Linx team. We build in public — see exactly what\'s new each week.' });
  }
}
