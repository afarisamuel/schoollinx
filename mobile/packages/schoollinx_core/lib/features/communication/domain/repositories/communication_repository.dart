import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/notice_entity.dart';

abstract class CommunicationRepository {
  Future<Either<Failure, List<NoticeEntity>>> getNotices();
  Future<Either<Failure, bool>> sendBroadcast({
    required String title,
    required String message,
    required String channel,
    required String targetRole,
  });
}
