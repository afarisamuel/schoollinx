import 'package:dartz/dartz.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/notice_entity.dart';
import '../../domain/repositories/communication_repository.dart';
import '../datasources/communication_remote_datasource.dart';

class CommunicationRepositoryImpl implements CommunicationRepository {
  final CommunicationRemoteDataSource remoteDataSource;

  CommunicationRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<NoticeEntity>>> getNotices() async {
    try {
      final notices = await remoteDataSource.getNotices();
      return Right(notices);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> sendBroadcast({
    required String title,
    required String message,
    required String channel,
    required String targetRole,
  }) async {
    try {
      final success = await remoteDataSource.sendBroadcast(
        title: title,
        message: message,
        channel: channel,
        targetRole: targetRole,
      );
      return Right(success);
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(ServerFailure(message: e.toString()));
    }
  }
}
