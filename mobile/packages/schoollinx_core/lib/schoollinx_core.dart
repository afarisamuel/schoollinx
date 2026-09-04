// Core exports
export 'core/di/injection_container.dart';
export 'core/errors/exceptions.dart';
export 'core/errors/failures.dart';
export 'core/network/api_client.dart';
export 'core/network/api_endpoints.dart';
export 'core/theme/app_colors.dart';
export 'core/theme/app_theme.dart';
export 'core/usecases/usecase.dart';
export 'package:lucide_icons_flutter/lucide_icons.dart';

// Common widgets
export 'features/common_widgets/sl_card.dart';
export 'features/common_widgets/sl_button.dart';
export 'features/common_widgets/sl_input.dart';
export 'features/common_widgets/sl_badge.dart';
export 'features/common_widgets/sl_avatar.dart';
export 'features/common_widgets/sl_school_search_input.dart';

// Auth exports
export 'features/auth/domain/entities/user_entity.dart';
export 'features/auth/domain/entities/tenant_entity.dart';
export 'features/auth/domain/repositories/auth_repository.dart';
export 'features/auth/domain/usecases/login_usecase.dart';
export 'features/auth/domain/usecases/logout_usecase.dart';
export 'features/auth/domain/usecases/get_current_user_usecase.dart';
export 'features/auth/domain/usecases/resolve_tenant_usecase.dart';
export 'features/auth/domain/usecases/search_tenants_usecase.dart';
export 'features/auth/presentation/bloc/auth_bloc.dart';
export 'features/auth/presentation/bloc/auth_event.dart';
export 'features/auth/presentation/bloc/auth_state.dart';

// Academics exports
export 'features/academics/domain/entities/academic_class_entity.dart';
export 'features/academics/domain/entities/student_entity.dart';
export 'features/academics/domain/entities/teacher_entity.dart';
export 'features/academics/domain/entities/attendance_record.dart';
export 'features/academics/domain/entities/grade_record.dart';
export 'features/academics/domain/entities/homework_entity.dart';
export 'features/academics/domain/entities/timetable_entry_entity.dart';
export 'features/academics/domain/entities/academic_extra_entities.dart';
export 'features/academics/domain/repositories/academic_repository.dart';
export 'features/academics/domain/usecases/academics_usecases.dart';
export 'features/academics/presentation/bloc/attendance_bloc.dart';
export 'features/academics/presentation/bloc/grading_bloc.dart';
export 'features/academics/presentation/bloc/homework_bloc.dart';
export 'features/academics/presentation/bloc/timetable_bloc.dart';
export 'features/academics/presentation/bloc/cbt_bloc.dart';
export 'features/academics/presentation/bloc/library_bloc.dart';

// Finance exports
export 'features/finance/domain/entities/finance_entities.dart';
export 'features/finance/domain/repositories/finance_repository.dart';
export 'features/finance/domain/usecases/finance_usecases.dart';
export 'features/finance/presentation/bloc/finance_bloc.dart';
export 'features/finance/presentation/bloc/defaulters_bloc.dart';

// Logistics exports
export 'features/logistics/domain/entities/bus_route_entity.dart';
export 'features/logistics/domain/repositories/logistics_repository.dart';
export 'features/logistics/domain/usecases/logistics_usecases.dart';
export 'features/logistics/presentation/bloc/logistics_bloc.dart';

// Guardian exports
export 'features/guardian/domain/entities/child_entity.dart';
export 'features/guardian/domain/entities/guardian_extra_entities.dart';
export 'features/guardian/domain/repositories/guardian_repository.dart';
export 'features/guardian/domain/usecases/guardian_usecases.dart';
export 'features/guardian/presentation/bloc/guardian_bloc.dart';
export 'features/guardian/presentation/bloc/absence_bloc.dart';
export 'features/guardian/presentation/bloc/pta_bloc.dart';
export 'features/guardian/presentation/bloc/wallet_bloc.dart';

// Daily Bills exports
export 'features/daily_bills/domain/entities/daily_bill_entity.dart';
export 'features/daily_bills/domain/repositories/daily_bill_repository.dart';
export 'features/daily_bills/domain/usecases/daily_bills_usecases.dart';
export 'features/daily_bills/presentation/bloc/daily_bills_bloc.dart';

// Communication exports
export 'features/communication/domain/entities/notice_entity.dart';
export 'features/communication/domain/repositories/communication_repository.dart';
export 'features/communication/domain/usecases/communication_usecases.dart';
export 'features/communication/presentation/bloc/communication_bloc.dart';

// Welfare exports
export 'features/welfare/domain/entities/clinic_visit_entity.dart';
export 'features/welfare/domain/repositories/welfare_repository.dart';
export 'features/welfare/domain/usecases/welfare_usecases.dart';
export 'features/welfare/presentation/bloc/welfare_bloc.dart';

// House Merit exports
export 'features/house_merit/domain/entities/house_merit_entity.dart';
export 'features/house_merit/domain/repositories/house_merit_repository.dart';
export 'features/house_merit/domain/usecases/house_merit_usecases.dart';
export 'features/house_merit/presentation/bloc/house_merit_bloc.dart';

// HR Portal exports
export 'features/hr_portal/domain/entities/staff_leave_entity.dart';
export 'features/hr_portal/domain/repositories/hr_portal_repository.dart';
export 'features/hr_portal/domain/usecases/hr_portal_usecases.dart';
export 'features/hr_portal/presentation/bloc/hr_portal_bloc.dart';
