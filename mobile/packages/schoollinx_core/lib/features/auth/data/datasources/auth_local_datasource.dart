import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/tenant_model.dart';
import '../models/user_model.dart';
import '../../../../core/errors/exceptions.dart';

abstract class AuthLocalDataSource {
  Future<void> saveTokens({required String accessToken, String? refreshToken});
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> clearTokens();

  Future<void> saveUser(UserModel user);
  Future<UserModel?> getCachedUser();
  Future<void> clearUser();

  Future<void> saveSelectedTenant(TenantModel tenant);
  Future<TenantModel?> getSelectedTenant();
  Future<void> clearSelectedTenant();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final FlutterSecureStorage secureStorage;
  final SharedPreferences sharedPreferences;

  static const String keyAccessToken = 'sl_access_token';
  static const String keyRefreshToken = 'sl_refresh_token';
  static const String keyCachedUser = 'sl_cached_user';
  static const String keySelectedTenant = 'sl_selected_tenant';

  AuthLocalDataSourceImpl({
    required this.secureStorage,
    required this.sharedPreferences,
  });

  @override
  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    try {
      await secureStorage.write(key: keyAccessToken, value: accessToken);
      if (refreshToken != null) {
        await secureStorage.write(key: keyRefreshToken, value: refreshToken);
      }
    } catch (e) {
      throw CacheException(message: 'Failed to securely store authentication tokens: $e');
    }
  }

  @override
  Future<String?> getAccessToken() async {
    try {
      return await secureStorage.read(key: keyAccessToken);
    } catch (e) {
      throw CacheException(message: 'Failed to read access token: $e');
    }
  }

  @override
  Future<String?> getRefreshToken() async {
    try {
      return await secureStorage.read(key: keyRefreshToken);
    } catch (e) {
      throw CacheException(message: 'Failed to read refresh token: $e');
    }
  }

  @override
  Future<void> clearTokens() async {
    try {
      await secureStorage.delete(key: keyAccessToken);
      await secureStorage.delete(key: keyRefreshToken);
    } catch (e) {
      throw CacheException(message: 'Failed to clear tokens: $e');
    }
  }

  @override
  Future<void> saveUser(UserModel user) async {
    try {
      final jsonString = jsonEncode(user.toJson());
      await sharedPreferences.setString(keyCachedUser, jsonString);
    } catch (e) {
      throw CacheException(message: 'Failed to cache user profile: $e');
    }
  }

  @override
  Future<UserModel?> getCachedUser() async {
    try {
      final jsonString = sharedPreferences.getString(keyCachedUser);
      if (jsonString == null) return null;
      final Map<String, dynamic> jsonMap = jsonDecode(jsonString);
      return UserModel.fromJson(jsonMap);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> clearUser() async {
    await sharedPreferences.remove(keyCachedUser);
  }

  @override
  Future<void> saveSelectedTenant(TenantModel tenant) async {
    try {
      final jsonString = jsonEncode(tenant.toJson());
      await sharedPreferences.setString(keySelectedTenant, jsonString);
    } catch (e) {
      throw CacheException(message: 'Failed to cache selected institution: $e');
    }
  }

  @override
  Future<TenantModel?> getSelectedTenant() async {
    try {
      final jsonString = sharedPreferences.getString(keySelectedTenant);
      if (jsonString == null) return null;
      final Map<String, dynamic> jsonMap = jsonDecode(jsonString);
      return TenantModel.fromJson(jsonMap);
    } catch (e) {
      return null;
    }
  }

  @override
  Future<void> clearSelectedTenant() async {
    await sharedPreferences.remove(keySelectedTenant);
  }
}
