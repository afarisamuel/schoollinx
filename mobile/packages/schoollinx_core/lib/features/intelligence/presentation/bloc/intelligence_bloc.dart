import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/institutional_kpi_entity.dart';
import '../../domain/usecases/get_institutional_kpis_usecase.dart';

// EVENTS
abstract class IntelligenceEvent extends Equatable {
  const IntelligenceEvent();
  @override
  List<Object?> get props => [];
}

class FetchInstitutionalKpisEvent extends IntelligenceEvent {}

// STATES
abstract class IntelligenceState extends Equatable {
  const IntelligenceState();
  @override
  List<Object?> get props => [];
}

class IntelligenceInitial extends IntelligenceState {}
class IntelligenceLoading extends IntelligenceState {}

class InstitutionalKpisLoaded extends IntelligenceState {
  final InstitutionalKpiEntity kpis;
  const InstitutionalKpisLoaded(this.kpis);
  @override
  List<Object?> get props => [kpis];
}

class IntelligenceError extends IntelligenceState {
  final String message;
  const IntelligenceError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class IntelligenceBloc extends Bloc<IntelligenceEvent, IntelligenceState> {
  final GetInstitutionalKpisUseCase getInstitutionalKpisUseCase;

  IntelligenceBloc({required this.getInstitutionalKpisUseCase})
      : super(IntelligenceInitial()) {
    on<FetchInstitutionalKpisEvent>((event, emit) async {
      emit(IntelligenceLoading());
      final result = await getInstitutionalKpisUseCase(NoParams());
      result.fold(
        (failure) => emit(IntelligenceError(failure.message)),
        (kpis) => emit(InstitutionalKpisLoaded(kpis)),
      );
    });
  }
}
