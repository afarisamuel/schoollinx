package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/domain"
)

type departmentUseCase struct {
	deptRepo domain.DepartmentRepository
}

func NewDepartmentUseCase(repo domain.DepartmentRepository) domain.DepartmentUseCase {
	return &departmentUseCase{deptRepo: repo}
}

func (u *departmentUseCase) CreateDepartment(ctx context.Context, dept *domain.Department) error {
	return u.deptRepo.Create(ctx, dept)
}

func (u *departmentUseCase) GetDepartmentByID(ctx context.Context, id uuid.UUID) (*domain.Department, error) {
	return u.deptRepo.GetByID(ctx, id)
}

func (u *departmentUseCase) GetAllDepartments(ctx context.Context) ([]domain.Department, error) {
	return u.deptRepo.GetAll(ctx)
}


func (u *departmentUseCase) UpdateDepartment(ctx context.Context, dept *domain.Department) error {
	return u.deptRepo.Update(ctx, dept)
}

func (u *departmentUseCase) DeleteDepartment(ctx context.Context, id uuid.UUID) error {
	return u.deptRepo.Delete(ctx, id)
}
