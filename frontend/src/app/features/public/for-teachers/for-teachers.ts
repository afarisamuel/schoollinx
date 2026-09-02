import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-for-teachers',
  imports: [RouterModule],
  templateUrl: './for-teachers.html',
  styleUrl: './for-teachers.css'
})
export class ForTeachers implements OnInit {
  constructor(private meta: Meta, private title: Title) {}
  ngOnInit() {
    this.title.setTitle('School Linx for Teachers — Less Admin, More Teaching');
    this.meta.updateTag({ name: 'description', content: 'Digital grade book, one-click attendance, and automated report cards. School Linx helps teachers spend less time on paperwork and more time on teaching.' });
  }
}
