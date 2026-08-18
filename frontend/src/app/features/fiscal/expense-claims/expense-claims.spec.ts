import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseClaims } from './expense-claims';

describe('ExpenseClaims', () => {
  let component: ExpenseClaims;
  let fixture: ComponentFixture<ExpenseClaims>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseClaims]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseClaims);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
