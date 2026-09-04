import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/child_entity.dart';
import '../../domain/usecases/guardian_usecases.dart';

// EVENTS
abstract class GuardianEvent extends Equatable {
  const GuardianEvent();
  @override
  List<Object?> get props => [];
}

class LoadGuardianChildrenEvent extends GuardianEvent {}

class SelectChildEvent extends GuardianEvent {
  final ChildEntity child;
  const SelectChildEvent(this.child);
  @override
  List<Object?> get props => [child];
}

class FetchChildAcademicsEvent extends GuardianEvent {
  final String studentId;
  const FetchChildAcademicsEvent(this.studentId);
  @override
  List<Object?> get props => [studentId];
}

class FetchChildPickupPassEvent extends GuardianEvent {
  final String childId;
  const FetchChildPickupPassEvent(this.childId);
  @override
  List<Object?> get props => [childId];
}

// STATES
abstract class GuardianState extends Equatable {
  const GuardianState();
  @override
  List<Object?> get props => [];
}

class GuardianInitial extends GuardianState {}
class GuardianLoading extends GuardianState {}

class GuardianChildrenLoaded extends GuardianState {
  final List<ChildEntity> children;
  final ChildEntity? selectedChild;
  final Map<String, dynamic>? academicDetails;
  final PickupPassEntity? pickupPass;

  const GuardianChildrenLoaded({
    required this.children,
    this.selectedChild,
    this.academicDetails,
    this.pickupPass,
  });

  GuardianChildrenLoaded copyWith({
    List<ChildEntity>? children,
    ChildEntity? selectedChild,
    Map<String, dynamic>? academicDetails,
    PickupPassEntity? pickupPass,
  }) {
    return GuardianChildrenLoaded(
      children: children ?? this.children,
      selectedChild: selectedChild ?? this.selectedChild,
      academicDetails: academicDetails ?? this.academicDetails,
      pickupPass: pickupPass ?? this.pickupPass,
    );
  }

  @override
  List<Object?> get props => [children, selectedChild, academicDetails, pickupPass];
}

class GuardianError extends GuardianState {
  final String message;
  const GuardianError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class GuardianBloc extends Bloc<GuardianEvent, GuardianState> {
  final GetChildrenUseCase getChildrenUseCase;
  final GetChildAcademicsUseCase getChildAcademicsUseCase;
  final GetPickupPassUseCase getPickupPassUseCase;

  List<ChildEntity> _children = [];
  ChildEntity? _selectedChild;

  GuardianBloc({
    required this.getChildrenUseCase,
    required this.getChildAcademicsUseCase,
    required this.getPickupPassUseCase,
  }) : super(GuardianInitial()) {
    on<LoadGuardianChildrenEvent>((event, emit) async {
      emit(GuardianLoading());
      final result = await getChildrenUseCase(NoParams());
      result.fold(
        (failure) => emit(GuardianError(failure.message)),
        (children) {
          _children = children;
          if (children.isNotEmpty) {
            _selectedChild = children.first;
            add(FetchChildAcademicsEvent(children.first.id));
          } else {
            emit(const GuardianChildrenLoaded(children: []));
          }
        },
      );
    });

    on<SelectChildEvent>((event, emit) {
      _selectedChild = event.child;
      add(FetchChildAcademicsEvent(event.child.id));
    });

    on<FetchChildAcademicsEvent>((event, emit) async {
      final academicsResult = await getChildAcademicsUseCase(event.studentId);
      final passResult = await getPickupPassUseCase(event.studentId);

      Map<String, dynamic> academics = {};
      PickupPassEntity? pass;

      academicsResult.fold(
        (_) {},
        (data) => academics = data,
      );

      passResult.fold(
        (_) {},
        (p) => pass = p,
      );

      emit(GuardianChildrenLoaded(
        children: _children,
        selectedChild: _selectedChild,
        academicDetails: academics,
        pickupPass: pass,
      ));
    });

    on<FetchChildPickupPassEvent>((event, emit) async {
      final result = await getPickupPassUseCase(event.childId);
      result.fold(
        (failure) => emit(GuardianError(failure.message)),
        (pass) {
          if (state is GuardianChildrenLoaded) {
            emit((state as GuardianChildrenLoaded).copyWith(pickupPass: pass));
          }
        },
      );
    });
  }
}
