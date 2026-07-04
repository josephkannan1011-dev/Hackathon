import { loadDatabase, saveDatabase, createNotification, logAction } from './db';

/**
 * Checks all active complaints against their SLA configurations and escalates them if necessary.
 * Support demo-mode manual age acceleration to easily demonstrate this in real time.
 */
export function checkAndRunEscalations(forceAddHours: number = 0): { escalatedCount: number; details: string[] } {
  const db = loadDatabase();
  let escalatedCount = 0;
  const details: string[] = [];

  const now = new Date();

  db.complaints = db.complaints.map(complaint => {
    // Skip if resolved or rejected
    if (complaint.status === 'completed' || complaint.status === 'rejected') {
      return complaint;
    }

    // Determine SLA limit in hours based on priority
    let slaLimitHours = 48; // default Low
    if (complaint.priority === 'medium') slaLimitHours = 24;
    else if (complaint.priority === 'high') slaLimitHours = 12;
    else if (complaint.priority === 'critical') slaLimitHours = 2;

    const createdAtDate = new Date(complaint.createdAt);
    
    // If we are simulating time advancement, we offset the comparison
    const simulatedElapsedMs = now.getTime() - createdAtDate.getTime() + (forceAddHours * 60 * 60 * 1000);
    const elapsedHours = simulatedElapsedMs / (1000 * 60 * 60);

    let newLevel = complaint.escalationLevel;
    let breached = false;

    // SLA Tiering logic
    if (elapsedHours > slaLimitHours * 3 && complaint.escalationLevel < 3) {
      newLevel = 3; // District Collector
      breached = true;
    } else if (elapsedHours > slaLimitHours * 2 && complaint.id && complaint.escalationLevel < 2) {
      newLevel = 2; // District Officer
      breached = true;
    } else if (elapsedHours > slaLimitHours && complaint.escalationLevel < 1) {
      newLevel = 1; // Department Head
      breached = true;
    }

    // Apply the simulation back to createdAt if forceAddHours was used
    if (forceAddHours > 0) {
      const simulatedCreatedDate = new Date(createdAtDate.getTime() - (forceAddHours * 60 * 60 * 1000));
      complaint.createdAt = simulatedCreatedDate.toISOString();
    }

    if (breached && newLevel > complaint.escalationLevel) {
      const levelNames = ['None', 'Department Head', 'District Officer', 'District Collector'];
      const oldLevelName = levelNames[complaint.escalationLevel];
      const newLevelName = levelNames[newLevel];
      
      complaint.isEscalated = true;
      complaint.escalationLevel = newLevel;
      complaint.updatedAt = now.toISOString();

      escalatedCount++;
      const message = `Complaint ${complaint.id} (${complaint.title}) breached its SLA limit of ${slaLimitHours} hours. Escalated from ${oldLevelName} to ${newLevelName}!`;
      details.push(message);

      // Log to Audit Log
      logAction('SLA_BREACH_ESCALATION', 'SLA_ENGINE', message);

      // Notify citizen who created it
      // Extract Citizen ID from support or we look for its support owners (first supporter is usually the creator)
      const citizenCreator = complaint.supporters[0] || 'Citizen-X83P2A';
      createNotification(
        citizenCreator,
        `⚠️ SLA Breached: Escalated to ${newLevelName}`,
        `Your complaint ${complaint.id} is taking longer than expected. It has been escalated to the ${newLevelName} for immediate review.`,
        complaint.id
      );

      // Notify department officer that they received a warning
      if (complaint.officerId) {
        createNotification(
          complaint.officerId,
          `🚨 SLA BREACH WARNING: Escalated!`,
          `Complaint ${complaint.id} assigned to you has breached SLA. It has been escalated to your ${newLevelName}.`,
          complaint.id
        );
      }

      // Notify admin
      createNotification(
        'Admin-01',
        `📢 SLA Breach: ${complaint.id}`,
        `Complaint ${complaint.id} has breached Tier ${newLevel} SLA. Now at ${newLevelName} level.`,
        complaint.id
      );
    }

    return complaint;
  });

  if (escalatedCount > 0) {
    saveDatabase(db);
  }

  return { escalatedCount, details };
}
