import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-for-parents',
  imports: [RouterModule],
  templateUrl: './for-parents.html',
})
export class ForParents implements OnInit {
  constructor(private meta: Meta, private title: Title) {}
  ngOnInit() {
    this.title.setTitle('School Linx for Parents — Stay Close to Your Child\'s Education');
    this.meta.updateTag({ name: 'description', content: 'Real-time grades, attendance alerts, and online fee payments. School Linx keeps parents fully informed about their child\'s school life.' });
  }
}
