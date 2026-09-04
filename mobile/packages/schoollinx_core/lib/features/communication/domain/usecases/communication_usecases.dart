import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/usecases/usecase.dart';
import '../entities/notice_entity.dart';
import '../repositories/communication_repository.dart';

class GetNoticesUseCase implements UseCase<List<NoticeEntity>, NoParams> {
  final CommunicationRepository repository;
  GetNoticesUseCase(this.repository);
  @override
  Future<Either<Failure, List<NoticeEntity>>> call(NoParams params) {
    return repository.getNotices();
  }
}

class SendBroadcastParams {
  final String title;
  final String message;
  final String channel;
  final String targetRole;

  SendBroadcastParams({
    required this.title,
    required this.message,
    required this.channel,
    required this.targetRole,
  });
}

class SendBroadcastUseCase implements UseCase<bool, SendBroadcastParams> {
  final CommunicationRepository repository;
  SendBroadcastUseCase(this.repository);
  @override
  Future<Either<Failure, bool>> call(SendBroadcastParams params) {
    return repository.sendBroadcast(
      title: params.title,
      message: params.message,
      channel: params.channel,
      targetRole: params.targetRole,
    );
  }
}
