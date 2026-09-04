import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/guardian_extra_entities.dart';
import '../../domain/usecases/guardian_usecases.dart';

// EVENTS
abstract class WalletEvent extends Equatable {
  const WalletEvent();
  @override
  List<Object?> get props => [];
}

class LoadStudentWalletEvent extends WalletEvent {
  final String studentId;
  const LoadStudentWalletEvent(this.studentId);
  @override
  List<Object?> get props => [studentId];
}

class TopupStudentWalletEvent extends WalletEvent {
  final String studentId;
  final double amount;
  final String paymentMethod;
  const TopupStudentWalletEvent({
    required this.studentId,
    required this.amount,
    required this.paymentMethod,
  });
  @override
  List<Object?> get props => [studentId, amount, paymentMethod];
}

class UpdateDailySpendingLimitEvent extends WalletEvent {
  final String studentId;
  final double limit;
  const UpdateDailySpendingLimitEvent({required this.studentId, required this.limit});
  @override
  List<Object?> get props => [studentId, limit];
}

// STATES
abstract class WalletState extends Equatable {
  const WalletState();
  @override
  List<Object?> get props => [];
}

class WalletInitial extends WalletState {}
class WalletLoading extends WalletState {}

class WalletLoaded extends WalletState {
  final StudentWalletEntity wallet;
  const WalletLoaded(this.wallet);
  @override
  List<Object?> get props => [wallet];
}

class WalletActionSuccessState extends WalletState {
  final String message;
  const WalletActionSuccessState(this.message);
  @override
  List<Object?> get props => [message];
}

class WalletError extends WalletState {
  final String message;
  const WalletError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class WalletBloc extends Bloc<WalletEvent, WalletState> {
  final GetStudentWalletUseCase getStudentWalletUseCase;
  final TopupStudentWalletUseCase topupStudentWalletUseCase;

  WalletBloc({
    required this.getStudentWalletUseCase,
    required this.topupStudentWalletUseCase,
  }) : super(WalletInitial()) {
    on<LoadStudentWalletEvent>((event, emit) async {
      emit(WalletLoading());
      final result = await getStudentWalletUseCase(event.studentId);
      result.fold(
        (failure) => emit(WalletError(failure.message)),
        (wallet) => emit(WalletLoaded(wallet)),
      );
    });

    on<TopupStudentWalletEvent>((event, emit) async {
      emit(WalletLoading());
      final result = await topupStudentWalletUseCase(
        TopupStudentWalletParams(
          studentId: event.studentId,
          amount: event.amount,
          paymentMethod: event.paymentMethod,
        ),
      );
      result.fold(
        (failure) => emit(WalletError(failure.message)),
        (_) {
          emit(const WalletActionSuccessState('Digital canteen pocket money loaded successfully!'));
          add(LoadStudentWalletEvent(event.studentId));
        },
      );
    });

    on<UpdateDailySpendingLimitEvent>((event, emit) {
      if (state is WalletLoaded) {
        final current = (state as WalletLoaded).wallet;
        final updated = StudentWalletEntity(
          studentId: current.studentId,
          balance: current.balance,
          dailyLimit: event.limit,
          transactions: current.transactions,
        );
        emit(const WalletActionSuccessState('Daily canteen spending cap updated successfully.'));
        emit(WalletLoaded(updated));
      }
    });
  }
}
