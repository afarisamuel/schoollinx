import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransportDashboard } from './transport-dashboard';

describe('TransportDashboard', () => {
  let component: TransportDashboard;
  let fixture: ComponentFixture<TransportDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransportDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransportDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
