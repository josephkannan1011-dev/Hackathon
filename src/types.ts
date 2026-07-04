export interface User {
  id: string; // "Citizen-X83P2A" or "Officer-PWD" or "Admin-01"
  name: string;
  email: string;
  phone: string;
  role: 'citizen' | 'officer' | 'admin';
  departmentId?: string; // For officers
}

export type ComplaintStatus = 'new' | 'verified' | 'assigned' | 'inspection' | 'work_started' | 'completed' | 'rejected' | 'New' | 'Assigned' | 'In Progress' | 'Completed' | 'Rejected';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical' | 'Low' | 'Medium' | 'High' | 'Critical';

export interface Complaint {
  id: string; // CMP-YYYY-NNNNNN
  title: string;
  description: string;
  category: string;
  departmentId: string;
  officerId: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  priorityScore: number; // 1-100
  severity: number; // 1-5
  gps?: {
    lat: number;
    lng: number;
  };
  address?: string;
  createdAt: string;
  updatedAt: string;
  isEmergency: boolean;
  summary?: string; // AI generated summary
  remarks?: string; // Officer remarks
  completionPhotoUrl?: string; // Resolved state image
  photoUrl?: string; // Citizen attachment
  videoUrl?: string; // Citizen attachment
  voiceUrl?: string; // Citizen attachment
  supporters?: string[]; // List of anonymous citizen IDs
  supportersCount?: number;
  isEscalated?: boolean;
  escalationLevel: number; // 0 = Officer, 1 = Dept Head, 2 = District Officer, 3 = Collector
  slaDeadline?: string;

  // Aligned fields for dynamic simulations & backend responses
  citizenId?: string;
  supportCount?: number;
  priorityLevel?: string;
  suggestedDepartment?: string;
  assignedOfficer?: string;
  slaHours?: number;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  aiSummary?: string;
  aiEngineUsed?: string;
}

export interface Department {
  id: string; // e.g. "PWD", "MUN"
  name: string;
  icon: string;
  slaHours: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  complaintId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  suggestedDepartment?: string;
  prefillForm?: {
    title: string;
    description: string;
    category: string;
  };
}

export interface AnalyticsData {
  summary: {
    total: number;
    completed: number;
    pending: number;
    slaViolations: number;
    criticalCount: number;
    resolutionRate: number;
  };
  complaintsByDept: { name: string; value: number }[];
  departmentPerformance: {
    department: string;
    pending: number;
    avgResolutionHours: number;
  }[];
  auditLogs: {
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }[];
}

