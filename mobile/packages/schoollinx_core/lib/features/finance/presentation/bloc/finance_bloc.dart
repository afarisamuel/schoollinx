import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../../core/usecases/usecase.dart';
import '../../domain/entities/finance_entities.dart';
import '../../domain/usecases/finance_usecases.dart';

// EVENTS
abstract class FinanceEvent extends Equatable {
  const FinanceEvent();
  @override
  List<Object?> get props => [];
}

class FetchFiscalSummaryEvent extends FinanceEvent {}

class FetchFeeRecordsEvent extends FinanceEvent {
  final String? studentId;
  final String? status;
  const FetchFeeRecordsEvent({this.studentId, this.status});
  @override
  List<Object?> get props => [studentId, status];
}

class InitiatePaystackPaymentEvent extends FinanceEvent {
  final double amount;
  final String email;
  final String feeRecordId;
  final String channel;

  const InitiatePaystackPaymentEvent({
    required this.amount,
    required this.email,
    required this.feeRecordId,
    required this.channel,
  });

  @override
  List<Object?> get props => [amount, email, feeRecordId, channel];
}

class VerifyPaymentEvent extends FinanceEvent {
  final String reference;
  const VerifyPaymentEvent(this.reference);
  @override
  List<Object?> get props => [reference];
}

// STATES
abstract class FinanceState extends Equatable {
  const FinanceState();
  @override
  List<Object?> get props => [];
}

class FinanceInitial extends FinanceState {}
class FinanceLoading extends FinanceState {}

class FiscalSummaryLoaded extends FinanceState {
  final FiscalSummaryEntity summary;
  final List<FeeRecordEntity> records;
  const FiscalSummaryLoaded(this.summary, {this.records = const []});
  @override
  List<Object?> get props => [summary, records];
}

class FeeRecordsLoaded extends FinanceState {
  final List<FeeRecordEntity> records;
  const FeeRecordsLoaded(this.records);
  @override
  List<Object?> get props => [records];
}

class PaymentInitiatedState extends FinanceState {
  final PaymentResponseEntity response;
  const PaymentInitiatedState(this.response);
  @override
  List<Object?> get props => [response];
}

class PaymentVerificationSuccessState extends FinanceState {
  final String reference;
  const PaymentVerificationSuccessState(this.reference);
  @override
  List<Object?> get props => [reference];
}

class FinanceError extends FinanceState {
  final String message;
  const FinanceError(this.message);
  @override
  List<Object?> get props => [message];
}

// BLOC
class FinanceBloc extends Bloc<FinanceEvent, FinanceState> {
  final GetFiscalSummaryUseCase getFiscalSummaryUseCase;
  final GetFeeRecordsUseCase getFeeRecordsUseCase;
  final InitializePaymentUseCase initializePaymentUseCase;
  final VerifyPaymentUseCase verifyPaymentUseCase;

  FinanceBloc({
    required this.getFiscalSummaryUseCase,
    required this.getFeeRecordsUseCase,
    required this.initializePaymentUseCase,
    required this.verifyPaymentUseCase,
  }) : super(FinanceInitial()) {
    on<FetchFiscalSummaryEvent>((event, emit) async {
      emit(FinanceLoading());
      final result = await getFiscalSummaryUseCase(NoParams());
      final recordsResult = await getFeeRecordsUseCase(const GetFeeRecordsParams());
      final records = recordsResult.fold((_) => <FeeRecordEntity>[], (r) => r);

      result.fold(
        (failure) => emit(FinanceError(failure.message)),
        (summary) => emit(FiscalSummaryLoaded(summary, records: records)),
      );
    });

    on<FetchFeeRecordsEvent>((event, emit) async {
      emit(FinanceLoading());
      final result = await getFeeRecordsUseCase(
        GetFeeRecordsParams(studentId: event.studentId, status: event.status),
      );
      result.fold(
        (failure) => emit(FinanceError(failure.message)),
        (records) => emit(FeeRecordsLoaded(records)),
      );
    });

    on<InitiatePaystackPaymentEvent>((event, emit) async {
      emit(FinanceLoading());
      final result = await initializePaymentUseCase(
        InitializePaymentParams(
          amount: event.amount,
          email: event.email,
          feeRecordId: event.feeRecordId,
          channel: event.channel,
        ),
      );
      result.fold(
        (failure) => emit(FinanceError(failure.message)),
        (resp) => emit(PaymentInitiatedState(resp)),
      );
    });

    on<VerifyPaymentEvent>((event, emit) async {
      emit(FinanceLoading());
      final result = await verifyPaymentUseCase(event.reference);
      result.fold(
        (failure) => emit(FinanceError(failure.message)),
        (verified) {
          if (verified) {
            emit(PaymentVerificationSuccessState(event.reference));
          } else {
            emit(const FinanceError('Payment verification unconfirmed. Please check your bank/wallet statement.'));
          }
        },
      );
    });
  }
}
