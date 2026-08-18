import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetRegister } from './asset-register';

describe('AssetRegister', () => {
  let component: AssetRegister;
  let fixture: ComponentFixture<AssetRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetRegister]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
