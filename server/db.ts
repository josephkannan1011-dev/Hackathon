import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Department, Complaint, Notification, AuditLog } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface DatabaseSchema {
  users: User[];
  passwords: Record<string, string>; // Maps user ID to hashed password
  departments: Department[];
  complaints: Complaint[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

// Default Data Seed
const DEPARTMENTS: Department[] = [
  { id: 'PWD', name: 'Public Works Department', icon: 'hard-hat', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
  { id: 'MUN', name: 'Municipality (Sanitation & Garbage)', icon: 'trash-2', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
  { id: 'ELE', name: 'Electricity Department', icon: 'zap', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
  { id: 'WAT', name: 'Water Supply Department', icon: 'droplet', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
  { id: 'POL', name: 'Pollution Control Board', icon: 'wind', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
  { id: 'HEA', name: 'Health Department', icon: 'heart-pulse', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
  { id: 'AGR', name: 'Agriculture Department', icon: 'sprout', slaHours: { low: 48, medium: 24, high: 12, critical: 2 } },
];

function getInitialDeadlines(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    
    // Create pre-defined accounts
    const adminUser: User = {
      id: 'Admin-01',
      name: 'Super Admin',
      email: 'admin@civiclens.gov',
      phone: '+919999999999',
      role: 'admin',
    };

    const citizenUser: User = {
      id: 'Citizen-X83P2A',
      name: 'Joseph Kannan',
      email: 'citizen@gmail.com',
      phone: '+919876543210',
      role: 'citizen',
    };

    // Officers
    const officers: User[] = DEPARTMENTS.map((dept, index) => ({
      id: `Officer-${dept.id}`,
      name: `${dept.name} Lead Officer`,
      email: `officer_${dept.id.toLowerCase()}@civiclens.gov`,
      phone: `+91888880000${index}`,
      role: 'officer',
      departmentId: dept.id,
    }));

    const allUsers = [adminUser, citizenUser, ...officers];
    const passwords: Record<string, string> = {};

    passwords[adminUser.id] = bcrypt.hashSync('admin123', salt);
    passwords[citizenUser.id] = bcrypt.hashSync('citizen123', salt);
    officers.forEach(officer => {
      passwords[officer.id] = bcrypt.hashSync('password123', salt);
    });

    // Seed initial complaints with diverse states
    const complaints: Complaint[] = [
      {
        id: 'CMP-2026-000001',
        title: 'Major Road Pothole',
        description: 'Large, deep pothole in the middle of the main avenue, causing severe traffic jams and dangerous swerving.',
        category: 'Road Potholes & Cracks',
        departmentId: 'PWD',
        officerId: 'Officer-PWD',
        status: 'completed',
        priority: 'high',
        priorityScore: 78,
        severity: 4,
        gps: { lat: 13.0827, lng: 80.2707 },
        address: '12 Main St, Near Central Station, Chennai, Tamil Nadu',
        state: 'Tamil Nadu',
        district: 'Chennai',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        isEmergency: false,
        summary: 'Deep pothole detected on active main avenue causing safety risks and vehicle damage.',
        remarks: 'Pothole filled with standard quick-set bitumen mix. Road leveled and traffic flow restored.',
        completionPhotoUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80',
        supporters: ['Citizen-X83P2A', 'Citizen-XYZ123'],
        supportersCount: 2,
        isEscalated: false,
        escalationLevel: 0,
        slaDeadline: getInitialDeadlines(12),
      },
      {
        id: 'CMP-2026-000002',
        title: 'Overflowing Public Dustbins',
        description: 'Garbage bins at the corner have been overflowing for 3 days. Foul smell is spreading and attracting stray animals.',
        category: 'Garbage & Sanitation',
        departmentId: 'MUN',
        officerId: 'Officer-MUN',
        status: 'work_started',
        priority: 'medium',
        priorityScore: 52,
        severity: 3,
        gps: { lat: 28.6139, lng: 77.2090 },
        address: '45 Connaught Place, Commercial Block, New Delhi',
        state: 'Delhi',
        district: 'New Delhi',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        isEmergency: false,
        summary: 'Garbage accumulation at commercial site spreading odor and attracting pests.',
        remarks: 'Sanitation truck deployed. Cleaning crew has started clearing the backlog of garbage.',
        supporters: ['Citizen-ABC777'],
        supportersCount: 1,
        isEscalated: false,
        escalationLevel: 0,
        slaDeadline: getInitialDeadlines(24),
      },
      {
        id: 'CMP-2026-000003',
        title: 'Damaged Electric Cable Sparking',
        description: 'An overhead power cable has snapped and is hanging low near the school gate, sparking periodically during gusts.',
        category: 'Street Light & Electricals',
        departmentId: 'ELE',
        officerId: 'Officer-ELE',
        status: 'assigned',
        priority: 'critical',
        priorityScore: 98,
        severity: 5,
        gps: { lat: 19.0760, lng: 72.8777 },
        address: 'Marine Drive Pathway near Gate 3, Mumbai, Maharashtra',
        state: 'Maharashtra',
        district: 'Mumbai City',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        updatedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        isEmergency: true,
        summary: 'Low-hanging electrical cable sparking actively near a school entryway. Highly hazardous.',
        remarks: 'Assigned to emergency repair crew. Team dispatched with protective gears.',
        supporters: [],
        supportersCount: 0,
        isEscalated: false,
        escalationLevel: 0,
        slaDeadline: getInitialDeadlines(2),
      },
      {
        id: 'CMP-2026-000004',
        title: 'Major Water Pipe Leakage',
        description: 'Drinking water pipeline has burst, causing thousands of liters of clean water to flood the road.',
        category: 'Water Leakage & Drainage',
        departmentId: 'WAT',
        officerId: 'Officer-WAT',
        status: 'new',
        priority: 'medium',
        priorityScore: 65,
        severity: 3,
        gps: { lat: 12.9716, lng: 77.5946 },
        address: 'Opposite Metro Station Pillar 120, MG Road, Bengaluru, Karnataka',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), // 36 hours ago (Exceeds medium SLA 24h! Will trigger escalation!)
        updatedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        isEmergency: false,
        summary: 'Burst water main discharging high volume of potable water and flooding road surface.',
        supporters: [],
        supportersCount: 0,
        isEscalated: true,
        escalationLevel: 1, // Already escalated to Department Head due to SLA timeout!
        slaDeadline: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // Deadline was 12h ago
      },
    ];

    const notifications: Notification[] = [
      {
        id: 'NTF-01',
        userId: 'Citizen-X83P2A',
        title: 'Complaint Resolved Successfully',
        message: 'Your complaint CMP-2026-000001 (Major Road Pothole) has been resolved by PWD.',
        createdAt: new Date().toISOString(),
        isRead: false,
        complaintId: 'CMP-2026-000001',
      }
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'LOG-01',
        action: 'SYSTEM_START',
        performedBy: 'System',
        timestamp: new Date().toISOString(),
        details: 'CivicLens AI Database Initialized successfully with default seeds.',
      }
    ];

    const initialDb: DatabaseSchema = {
      users: allUsers,
      passwords,
      departments: DEPARTMENTS,
      complaints,
      notifications,
      auditLogs,
    };

    saveDatabase(initialDb);
    return initialDb;
  }

  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(data) as DatabaseSchema;

    // Database Migration Step: Ensure every single complaint in db.json contains valid state and district attributes
    let dbChanged = false;
    db.complaints = db.complaints.map(c => {
      let pinChanged = false;
      if (!c.state) {
        if (c.address?.toLowerCase().includes('delhi')) {
          c.state = 'Delhi';
        } else if (c.address?.toLowerCase().includes('mumbai') || c.address?.toLowerCase().includes('maharashtra')) {
          c.state = 'Maharashtra';
        } else if (c.address?.toLowerCase().includes('bengaluru') || c.address?.toLowerCase().includes('karnataka') || c.address?.toLowerCase().includes('bangalore')) {
          c.state = 'Karnataka';
        } else {
          c.state = 'Tamil Nadu'; // Fallback seed state
        }
        pinChanged = true;
      }
      if (!c.district) {
        if (c.address?.toLowerCase().includes('new delhi') || c.address?.toLowerCase().includes('connaught place')) {
          c.district = 'New Delhi';
        } else if (c.address?.toLowerCase().includes('mumbai')) {
          c.district = 'Mumbai City';
        } else if (c.address?.toLowerCase().includes('bengaluru') || c.address?.toLowerCase().includes('bangalore')) {
          c.district = 'Bengaluru Urban';
        } else {
          c.district = 'Chennai'; // Fallback seed district
        }
        pinChanged = true;
      }
      if (pinChanged) dbChanged = true;
      return c;
    });

    if (dbChanged) {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    }

    return db;
  } catch (error) {
    console.error('Error reading database file, resetting...', error);
    // Return empty schema if corrupted
    return {
      users: [],
      passwords: {},
      departments: DEPARTMENTS,
      complaints: [],
      notifications: [],
      auditLogs: [],
    };
  }
}

export function saveDatabase(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database file:', error);
  }
}

export function logAction(action: string, performedBy: string, details: string) {
  const db = loadDatabase();
  const newLog: AuditLog = {
    id: `LOG-${Date.now()}`,
    action,
    performedBy,
    timestamp: new Date().toISOString(),
    details,
  };
  db.auditLogs.unshift(newLog);
  // Cap at 200 logs
  if (db.auditLogs.length > 200) {
    db.auditLogs = db.auditLogs.slice(0, 200);
  }
  saveDatabase(db);
}

export function createNotification(userId: string, title: string, message: string, complaintId?: string) {
  const db = loadDatabase();
  const newNotification: Notification = {
    id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    title,
    message,
    createdAt: new Date().toISOString(),
    isRead: false,
    complaintId,
  };
  db.notifications.unshift(newNotification);
  saveDatabase(db);
}
