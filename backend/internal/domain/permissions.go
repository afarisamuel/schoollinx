package domain

// Permission constants follow a "resource:action" naming convention.
const (
	// Student Management
	PermStudentsRead   = "students:read"
	PermStudentsWrite  = "students:write"
	PermStudentsDelete = "students:delete"

	// Teacher Management
	PermTeachersRead   = "teachers:read"
	PermTeachersWrite  = "teachers:write"
	PermTeachersDelete = "teachers:delete"

	// Academic / Grades
	PermGradesRead  = "grades:read"
	PermGradesWrite = "grades:write"

	// Attendance
	PermAttendanceRead  = "attendance:read"
	PermAttendanceWrite = "attendance:write"

	// Fiscal / Payments
	PermFiscalRead  = "fiscal:read"
	PermFiscalWrite = "fiscal:write"

	// Messaging
	PermMessagesRead  = "messages:read"
	PermMessagesWrite = "messages:write"

	// Reports
	PermReportsRead     = "reports:read"
	PermReportsGenerate = "reports:generate"

	// Library
	PermLibraryRead  = "library:read"
	PermLibraryWrite = "library:write"

	// Timetable
	PermTimetableRead  = "timetable:read"
	PermTimetableWrite = "timetable:write"

	// System / Tenant Admin
	PermSystemAdmin   = "system:admin"
	PermAuditRead     = "audit:read"
	PermTenantsManage = "tenants:manage"

	// HR / Payroll
	PermHRRead  = "hr:read"
	PermHRWrite = "hr:write"

	// Logistics
	PermLogisticsRead  = "logistics:read"
	PermLogisticsWrite = "logistics:write"

	// Welfare / Health
	PermWelfareRead  = "welfare:read"
	PermWelfareWrite = "welfare:write"

	// Inventory / Assets
	PermInventoryRead  = "inventory:read"
	PermInventoryWrite = "inventory:write"

	// Procurement
	PermProcurementRead  = "procurement:read"
	PermProcurementWrite = "procurement:write"

	// Facility / Campus
	PermFacilityRead  = "facility:read"
	PermFacilityWrite = "facility:write"

	// Exams / CBT
	PermExamsRead  = "exams:read"
	PermExamsWrite = "exams:write"
)

// GetPermissionsForRole returns the default permission set for a given role.
func GetPermissionsForRole(role Role) []string {
	switch role {
	case RoleEcopowerAdmin:
		return []string{
			PermStudentsRead, PermStudentsWrite, PermStudentsDelete,
			PermTeachersRead, PermTeachersWrite, PermTeachersDelete,
			PermGradesRead, PermGradesWrite,
			PermAttendanceRead, PermAttendanceWrite,
			PermFiscalRead, PermFiscalWrite,
			PermMessagesRead, PermMessagesWrite,
			PermReportsRead, PermReportsGenerate,
			PermLibraryRead, PermLibraryWrite,
			PermTimetableRead, PermTimetableWrite,
			PermSystemAdmin, PermAuditRead, PermTenantsManage,
			PermHRRead, PermHRWrite,
			PermLogisticsRead, PermLogisticsWrite,
			PermWelfareRead, PermWelfareWrite,
			PermInventoryRead, PermInventoryWrite,
			PermProcurementRead, PermProcurementWrite,
			PermFacilityRead, PermFacilityWrite,
			PermExamsRead, PermExamsWrite,
		}
	case RoleAdmin:
		return []string{
			PermStudentsRead, PermStudentsWrite, PermStudentsDelete,
			PermTeachersRead, PermTeachersWrite, PermTeachersDelete,
			PermGradesRead, PermGradesWrite,
			PermAttendanceRead, PermAttendanceWrite,
			PermFiscalRead, PermFiscalWrite,
			PermMessagesRead, PermMessagesWrite,
			PermReportsRead, PermReportsGenerate,
			PermLibraryRead, PermLibraryWrite,
			PermTimetableRead, PermTimetableWrite,
			PermAuditRead,
			PermHRRead, PermHRWrite,
			PermLogisticsRead, PermLogisticsWrite,
			PermWelfareRead, PermWelfareWrite,
			PermInventoryRead, PermInventoryWrite,
			PermProcurementRead, PermProcurementWrite,
			PermFacilityRead, PermFacilityWrite,
			PermExamsRead, PermExamsWrite,
		}
	case RoleTeacher:
		return []string{
			PermStudentsRead,
			PermGradesRead, PermGradesWrite,
			PermAttendanceRead, PermAttendanceWrite,
			PermMessagesRead, PermMessagesWrite,
			PermReportsRead,
			PermTimetableRead,
			PermLibraryRead,
		}
	case RoleStudent:
		return []string{
			PermGradesRead,
			PermAttendanceRead,
			PermMessagesRead, PermMessagesWrite,
			PermReportsRead,
			PermTimetableRead,
			PermLibraryRead,
		}
	case RoleGuardian:
		return []string{
			PermStudentsRead,
			PermGradesRead,
			PermAttendanceRead,
			PermFiscalRead,
			PermMessagesRead, PermMessagesWrite,
			PermReportsRead,
		}
	case RoleLibrarian:
		return []string{
			PermStudentsRead,
			PermLibraryRead, PermLibraryWrite,
			PermMessagesRead, PermMessagesWrite,
		}
	case RoleAccountant, RoleBursar:
		return []string{
			PermStudentsRead,
			PermFiscalRead, PermFiscalWrite,
			PermReportsRead, PermReportsGenerate,
			PermProcurementRead,
			PermMessagesRead, PermMessagesWrite,
		}
	case RoleHRManager:
		return []string{
			PermTeachersRead, PermTeachersWrite, PermTeachersDelete,
			PermHRRead, PermHRWrite,
			PermReportsRead, PermReportsGenerate,
			PermMessagesRead, PermMessagesWrite,
		}
	case RoleLogisticsManager:
		return []string{
			PermLogisticsRead, PermLogisticsWrite,
			PermFacilityRead,
			PermInventoryRead,
			PermReportsRead,
			PermMessagesRead, PermMessagesWrite,
		}
	case RoleOperationsManager:
		return []string{
			PermStudentsRead, PermTeachersRead,
			PermFacilityRead, PermFacilityWrite,
			PermInventoryRead, PermInventoryWrite,
			PermProcurementRead, PermProcurementWrite,
			PermLogisticsRead, PermLogisticsWrite,
			PermReportsRead, PermReportsGenerate,
			PermMessagesRead, PermMessagesWrite,
		}
	case RoleHeadmaster:
		return []string{
			PermStudentsRead, PermTeachersRead,
			PermGradesRead, PermAttendanceRead,
			PermFiscalRead, PermHRRead,
			PermReportsRead, PermReportsGenerate,
			PermMessagesRead, PermMessagesWrite,
			PermExamsRead,
		}
	case RoleClerk:
		return []string{
			PermStudentsRead, PermStudentsWrite,
			PermTeachersRead,
			PermAttendanceRead, PermAttendanceWrite,
			PermMessagesRead, PermMessagesWrite,
		}
	case RoleNurse:
		return []string{
			PermStudentsRead,
			PermWelfareRead, PermWelfareWrite,
			PermMessagesRead, PermMessagesWrite,
			PermInventoryRead, // For medical supplies
		}
	case RoleITAdmin:
		return []string{
			PermAuditRead,
			PermFacilityRead, PermFacilityWrite, // Server rooms, assets
			PermInventoryRead, PermInventoryWrite, // Laptops, projectors
			PermMessagesRead, PermMessagesWrite,
		}
	default:
		return []string{}
	}
}


// GetPermissionsForUser returns the union of role-based permissions and custom permissions for a user.
func GetPermissionsForUser(u *User) []string {
	base := GetPermissionsForRole(u.Role)
	if len(u.CustomPermissions) == 0 {
		return base
	}

	permSet := make(map[string]struct{})
	for _, p := range base {
		permSet[p] = struct{}{}
	}
	for _, p := range u.CustomPermissions {
		permSet[p] = struct{}{}
	}

	merged := make([]string, 0, len(permSet))
	for p := range permSet {
		merged = append(merged, p)
	}
	return merged
}
