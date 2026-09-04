import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/house_merit_entity.dart';
import '../../domain/usecases/house_merit_usecases.dart';

// Events
abstract class HouseMeritEvent extends Equatable {
  const HouseMeritEvent();
  @override
  List<Object?> get props => [];
}

class LoadHouseLeaderboardEvent extends HouseMeritEvent {
  const LoadHouseLeaderboardEvent();
}

class LoadStudentMeritHistoryEvent extends HouseMeritEvent {
  final String studentId;
  const LoadStudentMeritHistoryEvent(this.studentId);
  @override
  List<Object?> get props => [studentId];
}

class AwardMeritPointsEvent extends HouseMeritEvent {
  final String studentId;
  final String houseId;
  final int points;
  final String reason;
  final String category;

  const AwardMeritPointsEvent({
    required this.studentId,
    required this.houseId,
    required this.points,
    required this.reason,
    required this.category,
  });

  @override
  List<Object?> get props => [studentId, houseId, points, reason, category];
}

// States
abstract class HouseMeritState extends Equatable {
  const HouseMeritState();
  @override
  List<Object?> get props => [];
}

class HouseMeritInitialState extends HouseMeritState {}

class HouseMeritLoadingState extends HouseMeritState {}

class HouseLeaderboardLoadedState extends HouseMeritState {
  final List<SchoolHouseEntity> houses;
  const HouseLeaderboardLoadedState(this.houses);
  @override
  List<Object?> get props => [houses];
}

class StudentMeritHistoryLoadedState extends HouseMeritState {
  final List<StudentMeritRecordEntity> records;
  const StudentMeritHistoryLoadedState(this.records);
  @override
  List<Object?> get props => [records];
}

class MeritPointsAwardedState extends HouseMeritState {
  final StudentMeritRecordEntity record;
  const MeritPointsAwardedState(this.record);
  @override
  List<Object?> get props => [record];
}

class HouseMeritErrorState extends HouseMeritState {
  final String message;
  const HouseMeritErrorState(this.message);
  @override
  List<Object?> get props => [message];
}

// BLoC
class HouseMeritBloc extends Bloc<HouseMeritEvent, HouseMeritState> {
  final GetHouseLeaderboardUseCase getHouseLeaderboard;
  final GetStudentMeritHistoryUseCase getStudentMeritHistory;
  final AwardMeritPointsUseCase awardMeritPoints;

  HouseMeritBloc({
    required this.getHouseLeaderboard,
    required this.getStudentMeritHistory,
    required this.awardMeritPoints,
  }) : super(HouseMeritInitialState()) {
    on<LoadHouseLeaderboardEvent>((event, emit) async {
      emit(HouseMeritLoadingState());
      final result = await getHouseLeaderboard();
      result.fold(
        (failure) => emit(HouseMeritErrorState(failure.message)),
        (houses) => emit(HouseLeaderboardLoadedState(houses)),
      );
    });

    on<LoadStudentMeritHistoryEvent>((event, emit) async {
      emit(HouseMeritLoadingState());
      final result = await getStudentMeritHistory(event.studentId);
      result.fold(
        (failure) => emit(HouseMeritErrorState(failure.message)),
        (records) => emit(StudentMeritHistoryLoadedState(records)),
      );
    });

    on<AwardMeritPointsEvent>((event, emit) async {
      emit(HouseMeritLoadingState());
      final result = await awardMeritPoints(
        studentId: event.studentId,
        houseId: event.houseId,
        points: event.points,
        reason: event.reason,
        category: event.category,
      );
      result.fold(
        (failure) => emit(HouseMeritErrorState(failure.message)),
        (record) => emit(MeritPointsAwardedState(record)),
      );
    });
  }
}
