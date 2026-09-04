import 'package:dio/dio.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/network/api_client.dart';
import '../../domain/entities/notice_entity.dart';

class CommunicationRemoteDataSource {
  final ApiClient apiClient;

  CommunicationRemoteDataSource({required this.apiClient});

  Future<List<NoticeEntity>> getNotices() async {
    try {
      final response = await apiClient.dio.get('/communication/notices');
      final data = response.data;
      if (data is List) {
        return data.map((j) {
          final m = j as Map<String, dynamic>;
          return NoticeEntity(
            id: m['id']?.toString() ?? '',
            title: m['title']?.toString() ?? 'Announcement',
            message: m['message']?.toString() ?? m['content']?.toString() ?? '',
            channel: m['channel']?.toString() ?? 'PUSH',
            targetRole: m['target_role']?.toString() ?? 'ALL',
            createdAt: m['created_at'] != null
                ? DateTime.tryParse(m['created_at'].toString()) ?? DateTime.now()
                : DateTime.now(),
            authorName: m['author_name']?.toString() ?? 'Administration',
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to fetch notices: $e');
    }
  }

  Future<bool> sendBroadcast({
    required String title,
    required String message,
    required String channel,
    required String targetRole,
  }) async {
    try {
      final response = await apiClient.dio.post('/communication/broadcast', data: {
        'title': title,
        'message': message,
        'channel': channel.toLowerCase(),
        'target_role': targetRole.toLowerCase(),
      });
      return response.statusCode == 200 || response.statusCode == 201;
    } on DioException catch (e) {
      apiClient.handleDioError(e);
    } catch (e) {
      throw ServerException(message: 'Failed to send broadcast: $e');
    }
  }
}
