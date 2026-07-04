// lib/core/config/app_router.dart
"""
CivicLens AI - Production Flutter Codebase (MVVM with Riverpod & GoRouter)
Author: Senior Flutter Developer & UI/UX Specialist
"""

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// ----------------- MODEL -----------------

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
  final String citizenId; // E.g. Citizen-X83P2A
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

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'category': category,
    'location': {
      'lat': latitude,
      'lng': longitude,
      'address': address,
    },
    'photoUrl': photoUrl,
    'citizenId': citizenId,
  };
}

// ----------------- REPOSITORY -----------------

class ComplaintRepository {
  final Object _apiService; // Represents our secure HTTP (Dio) Client

  ComplaintRepository(this._apiService);

  Future<List<ComplaintModel>> getComplaints({String? role, String? dept, String? citizenId}) async {
    // In production: response = await _dio.get('/api/complaints', queryParameters: {...});
    // For demonstration, simulating API responses
    await Future.delayed(const Duration(seconds: 1));
    return [];
  }

  Future<ComplaintModel> createComplaint(ComplaintModel complaint) async {
    // response = await _dio.post('/api/complaints', data: complaint.toJson());
    await Future.delayed(const Duration(seconds: 1));
    return complaint;
  }

  Future<void> supportComplaint(String id, String citizenId) async {
    // await _dio.post('/api/complaints/$id/support', data: {'citizenId': citizenId});
    await Future.delayed(const Duration(milliseconds: 500));
  }
}

// ----------------- STATE MANAGEMENT (RIVERPOD NOTIFIER) -----------------

final complaintRepositoryProvider = Provider<ComplaintRepository>((ref) {
  return ComplaintRepository(Object()); // Mock Dio Client injected
});

class ComplaintListNotifier extends StateNotifier<AsyncValue<List<ComplaintModel>>> {
  final ComplaintRepository _repository;

  ComplaintListNotifier(this._repository) : super(const AsyncValue.loading()) {
    fetchComplaints();
  }

  Future<void> fetchComplaints() async {
    try {
      state = const AsyncValue.loading();
      final list = await _repository.getComplaints();
      state = AsyncValue.data(list);
    } catch (err, stack) {
      state = AsyncValue.error(err, stack);
    }
  }

  Future<bool> createNewComplaint(ComplaintModel draft) async {
    try {
      final created = await _repository.createComplaint(draft);
      state.whenData((currentList) {
        state = AsyncValue.data([created, ...currentList]);
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> supportIssue(String id, String citizenId) async {
    try {
      await _repository.supportComplaint(id, citizenId);
      // Optimistically update list state locally
      state.whenData((currentList) {
        final updated = currentList.map((item) {
          if (item.id == id) {
            return ComplaintModel(
              id: item.id,
              title: item.title,
              description: item.description,
              category: item.category,
              status: item.status,
              priorityScore: item.priorityScore + 3,
              priorityLevel: item.priorityLevel,
              suggestedDepartment: item.suggestedDepartment,
              latitude: item.latitude,
              longitude: item.longitude,
              address: item.address,
              photoUrl: item.photoUrl,
              citizenId: item.citizenId,
              supportCount: item.supportCount + 1,
              createdAt: item.createdAt,
            );
          }
          return item;
        }).toList();
        state = AsyncValue.data(updated);
      });
    } catch (e) {
      // Handle error states
    }
  }
}

final complaintListProvider = StateNotifierProvider<ComplaintListNotifier, AsyncValue<List<ComplaintModel>>>((ref) {
  final repo = ref.watch(complaintRepositoryProvider);
  return ComplaintListNotifier(repo);
});

// ----------------- VIEW / INTERFACE (MATERIAL DESIGN 3) -----------------

class ComplaintFormScreen extends ConsumerStatefulWidget {
  const ComplaintFormScreen({super.key});

  @override
  ConsumerState<ComplaintFormScreen> createState() => _ComplaintFormScreenState();
}

class _ComplaintFormScreenState extends ConsumerState<ComplaintFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  
  bool _isEmergency = false;
  double? _lat;
  double? _lng;
  String _address = "Locating via secure GPS...";
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _detectLiveGPS();
  }

  Future<void> _detectLiveGPS() async {
    // In production, uses Geolocator package:
    // Position pos = await Geolocator.getCurrentPosition();
    setState(() {
      _lat = 12.9716;
      _lng = 77.5946;
      _address = "Sector 4, Central Metro Ave, Bengaluru";
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'File Smart Complaint',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.blue[900],
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // True Identity Warning Info Card
              Card(
                color: Colors.amber[50],
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Colors.amber[300]!, width: 1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    children: [
                      Icon(Icons.security, color: Colors.amber[900]),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Anonymity Active: This issue will be submitted under your Decoupled ID: Citizen-X83P2A. Officers will never know your true name or email.',
                          style: TextStyle(color: Colors.amber[900], fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title Field
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Complaint Title',
                  hintText: 'e.g. Deep pothole on main road',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.title),
                ),
                validator: (val) => (val == null || val.length < 10) ? 'Enter at least 10 characters' : null,
              ),
              const SizedBox(height: 16),

              // Description Field
              TextFormField(
                controller: _descController,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Explain the issue in detail, include school, hospital nearby if any for priority scaling...',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.description),
                ),
                validator: (val) => (val == null || val.length < 20) ? 'Enter a detailed description (min 20 chars)' : null,
              ),
              const SizedBox(height: 16),

              // GPS Location Display
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.location_on, color: Colors.blue[900]),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('GPS Location Detected', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blue[900])),
                          Text(_address, style: const TextStyle(fontSize: 12)),
                          if (_lat != null) Text('Lat: $_lat, Lng: $_lng', style: TextStyle(fontFamily: 'FiraCode', fontSize: 10, color: Colors.grey[600])),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.map),
                      onPressed: () {
                        // Open Google Maps Picker modal
                      },
                    )
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Emergency Switch
              SwitchListTile(
                title: const Text('Is this an Emergency?', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Check for fires, road collapses, or severe traffic hazards requiring immediate dispatch.'),
                value: _isEmergency,
                activeColor: Colors.red[700],
                onChanged: (val) => setState(() => _isEmergency = val),
              ),
              const SizedBox(height: 24),

              // Submit Button
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isEmergency ? Colors.red[700] : Colors.blue[900],
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: _isLoading ? null : _submitComplaint,
                child: _isLoading 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : Text('Raise Complaint via Hybrid AI', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitComplaint() async {
    if (!_formKey.currentState!.validate() || _lat == null) return;

    setState(() => _isLoading = true);

    final draft = ComplaintModel(
      id: '',
      title: _titleController.text,
      description: _descController.text,
      category: _isEmergency ? 'Emergency' : 'Auto',
      status: 'New',
      priorityScore: 0,
      priorityLevel: 'Medium',
      suggestedDepartment: '',
      latitude: _lat!,
      longitude: _lng!,
      address: _address,
      citizenId: 'Citizen-X83P2A',
      supportCount: 0,
      createdAt: DateTime.now().toIso8601String(),
    );

    final success = await ref.read(complaintListProvider.notifier).createNewComplaint(draft);

    setState(() => _isLoading = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isEmergency ? '🚨 Critical Emergency Logged! Dispatching First Responders.' : 'Complaint registered! Hybrid AI is predicting departments.'),
          backgroundColor: _isEmergency ? Colors.red[900] : Colors.green[900],
        ),
      );
      context.pop();
    }
  }
}
