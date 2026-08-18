import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetPlanning } from './budget-planning';

describe('BudgetPlanning', () => {
  let component: BudgetPlanning;
  let fixture: ComponentFixture<BudgetPlanning>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetPlanning]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetPlanning);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
