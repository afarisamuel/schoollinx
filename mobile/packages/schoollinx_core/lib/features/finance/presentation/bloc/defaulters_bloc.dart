import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/finance_entities.dart';
import '../../domain/usecases/finance_usecases.dart';

// EVENTS
abstract class DefaultersEvent extends Equatable {
  const DefaultersEvent();
  @override
  List<Object?> get props => [];
}

class FetchDefaultersEvent extends DefaultersEvent {}

class FilterDefaultersEvent extends DefaultersEvent {
  final String? classId;
  final int? minDebtDays;
  const FilterDefaultersEvent({this.classId, this.minDebtDays});
  @override
  List<Object?> get props => [classId, minDebtDays];
}

class SendBulkDunningSmsEvent extends DefaultersEvent {
  final List<String> studentIds;
  final String template;
  const SendBulkDunningSmsEvent({required this.studentIds, required this.template});
  @override
  List<Object?> get props => [studentIds, template];
}

// STATES
abstract class DefaultersState extends Equatable {
  const DefaultersState();
  @override
  List<Object?> get props => [];
}

class DefaultersInitial extends DefaultersState {}
class DefaultersLoading extends DefaultersState {}

class DefaultersLoaded extends DefaultersState {
  final List<FeeRecordEntity> allDefaulters;
  final List<FeeRecordEntity> filteredDefaulters;
  final double totalOutstanding;
  final String? selectedClassId;
  final int? selectedDebtDays;

  const DefaultersLoaded({
    required this.allDefaulters,
    required this.filteredDefaulters,
    required this.totalOutstanding,
    this.selectedClassId,
    this.selectedDebtDays,
  });

  @override
  List<Object?> get props => [
    allDefaulters,
    filteredDefaulters,
    totalOutstanding,
    selectedClassId,
    selectedDebtDays,
  ];
}

class DunningSmsDispatchedState extends DefaultersState {
  final int count;
  const DunningSmsDispatchedState(this.count);
  @override
  List<Object?> get props => [count];
}

class DefaultersError extends DefaultersState {
  final String message;
  const DefaultersError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class DefaultersBloc extends Bloc<DefaultersEvent, DefaultersState> {
  final GetDefaultersUseCase getDefaultersUseCase;
  final SendDefaultersDunningSmsUseCase sendDefaultersDunningSmsUseCase;

  List<FeeRecordEntity> _cached = [];

  DefaultersBloc({
    required this.getDefaultersUseCase,
    required this.sendDefaultersDunningSmsUseCase,
  }) : super(DefaultersInitial()) {
    on<FetchDefaultersEvent>((event, emit) async {
      emit(DefaultersLoading());
      final result = await getDefaultersUseCase(NoParams());
      result.fold(
        (failure) => emit(DefaultersError(failure.message)),
        (defaulters) {
          _cached = defaulters;
          final total = defaulters.fold<double>(0, (sum, item) => sum + item.balance);
          emit(DefaultersLoaded(
            allDefaulters: defaulters,
            filteredDefaulters: defaulters,
            totalOutstanding: total,
          ));
        },
      );
    });

    on<FilterDefaultersEvent>((event, emit) {
      if (_cached.isEmpty) return;
      List<FeeRecordEntity> filtered = List.from(_cached);
      if (event.classId != null && event.classId!.isNotEmpty && event.classId != 'ALL') {
        filtered = filtered.where((d) => d.className == event.classId || d.id == event.classId).toList();
      }
      final total = filtered.fold<double>(0, (sum, item) => sum + item.balance);
      emit(DefaultersLoaded(
        allDefaulters: _cached,
        filteredDefaulters: filtered,
        totalOutstanding: total,
        selectedClassId: event.classId,
        selectedDebtDays: event.minDebtDays,
      ));
    });

    on<SendBulkDunningSmsEvent>((event, emit) async {
      emit(DefaultersLoading());
      final result = await sendDefaultersDunningSmsUseCase(
        SendDefaultersDunningParams(
          studentIds: event.studentIds,
          messageTemplate: event.template,
        ),
      );
      result.fold(
        (failure) => emit(DefaultersError(failure.message)),
        (_) {
          emit(DunningSmsDispatchedState(event.studentIds.length));
          add(FetchDefaultersEvent());
        },
      );
    });
  }
}
