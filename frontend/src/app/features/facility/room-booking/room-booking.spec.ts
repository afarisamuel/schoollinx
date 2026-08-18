import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomBooking } from './room-booking';

describe('RoomBooking', () => {
  let component: RoomBooking;
  let fixture: ComponentFixture<RoomBooking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomBooking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomBooking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
