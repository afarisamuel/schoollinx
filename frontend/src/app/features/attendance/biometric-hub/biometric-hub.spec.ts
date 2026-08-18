import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiometricHub } from './biometric-hub';

describe('BiometricHub', () => {
  let component: BiometricHub;
  let fixture: ComponentFixture<BiometricHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiometricHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiometricHub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
