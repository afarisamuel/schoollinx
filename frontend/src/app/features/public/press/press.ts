import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-press',
  imports: [RouterModule],
  templateUrl: './press.html',
  styleUrl: './press.css',
})
export class Press implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Press Kit & Media Resources | School Linx');
    this.meta.updateTag({ name: 'description', content: 'Download School Linx logos, brand guidelines, and company boilerplate. Contact our press team for media inquiries and analyst briefings.' });
  }
}
