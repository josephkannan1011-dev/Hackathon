export const flutterRiverpodCode = `// lib/core/config/app_router.dart
"""
CivicLens AI - Production Flutter Codebase (MVVM with Riverpod & GoRouter)
Author: Senior Flutter Developer & UI/UX Specialist
"""

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ComplaintModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final int priorityScore;
  final String priorityLevel;
  final String suggestedDepartment;
  final double latitude;
  final double longitude;
  final String address;
  final String? photoUrl;
  final String citizenId;
  final int supportCount;
  final String createdAt;

  ComplaintModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.priorityScore,
    required this.priorityLevel,
    required this.suggestedDepartment,
    required this.latitude,
    required this.longitude,
    required this.address,
    this.photoUrl,
    required this.citizenId,
    required this.supportCount,
    required this.createdAt,
  });

  factory ComplaintModel.fromJson(Map<String, dynamic> json) {
    return ComplaintModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      status: json['status'] ?? 'New',
      priorityScore: json['priority'] ?? 40,
      priorityLevel: json['priorityLevel'] ?? 'Medium',
      suggestedDepartment: json['suggestedDepartment'] ?? '',
      latitude: (json['location']?['lat'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['location']?['lng'] as num?)?.toDouble() ?? 0.0,
      address: json['location']?['address'] ?? '',
      photoUrl: json['photoUrl'],
      citizenId: json['citizenId'] ?? '',
      supportCount: json['supportCount'] ?? 0,
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class ComplaintRepository {
  Future<List<ComplaintModel>> getComplaints() async {
    await Future.delayed(const Duration(seconds: 1));
    return [];
  }
}

final complaintListProvider = StateNotifierProvider<ComplaintListNotifier, AsyncValue<List<ComplaintModel>>>((ref) {
  return ComplaintListNotifier(ComplaintRepository());
});

class ComplaintListNotifier extends StateNotifier<AsyncValue<List<ComplaintModel>>> {
  final ComplaintRepository _repository;
  ComplaintListNotifier(this._repository) : super(const AsyncValue.loading());
}
`;
