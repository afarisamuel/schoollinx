import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-blog',
  imports: [RouterModule],
  templateUrl: './blog.html',
  styleUrl: './blog.css',
})
export class Blog implements OnInit {
  constructor(private meta: Meta, private title: Title) {}

  ngOnInit() {
    this.title.setTitle('Blog & Insights | School Linx — EdTech Best Practices');
    this.meta.updateTag({ name: 'description', content: 'School administration best practices, edtech trends, and product deep-dives — curated for forward-thinking educators by the School Linx team.' });
    this.meta.updateTag({ name: 'keywords', content: 'school administration, edtech, school management, Africa education, student information system' });
  }
}
