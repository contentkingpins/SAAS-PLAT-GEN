import { LeadAlert, AlertType, AlertSeverity } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface AlertResult {
  leadId: string;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    isAcknowledged: boolean;
    relatedLeadId?: string;
    createdAt: Date;
  }>;
}

export interface BulkCheckResult {
  checked: number;
  alertsCreated: number;
  duplicatesFound: Array<{
    mbi: string;
    leadIds: string[];
  }>;
}

export class AlertService {
  /**
   * Check for duplicate MBI and create alert if found
   */
  static async checkForDuplicateAlert(leadId: string): Promise<AlertResult> {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { alerts: true }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Check for existing leads with same MBI
      const duplicateLeads = await prisma.lead.findMany({
        where: {
          mbi: lead.mbi,
          id: { not: leadId }, // Exclude current lead
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          vendor: {
            select: { name: true }
          }
        }
      });

      const existingAlerts = lead.alerts || [];
      let newAlerts: LeadAlert[] = [];

      // Create duplicate alerts if duplicates found and no existing alert
      if (duplicateLeads.length > 0) {
        const existingDuplicateAlert = existingAlerts.find(
          (alert: LeadAlert) => alert.type === 'MBI_DUPLICATE' && !alert.isAcknowledged
        );

        if (!existingDuplicateAlert) {
          // Create alert for each duplicate found
          for (const duplicate of duplicateLeads) {
            const alert = await prisma.leadAlert.create({
              data: {
                leadId: leadId,
                type: 'MBI_DUPLICATE',
                severity: 'HIGH',
                message: `Duplicate MBI detected: ${duplicate.firstName} ${duplicate.lastName} from ${duplicate.vendor.name} (submitted ${duplicate.createdAt.toLocaleDateString()})`,
                relatedLeadId: duplicate.id,
                metadata: {
                  duplicateLeadInfo: {
                    id: duplicate.id,
                    name: `${duplicate.firstName} ${duplicate.lastName}`,
                    vendor: duplicate.vendor.name,
                    submittedAt: duplicate.createdAt
                  }
                }
              }
            });
            newAlerts.push(alert);
          }

          // Update lead flags
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              hasActiveAlerts: true
            }
          });
        }
      }

      // Return all alerts for this lead
      const allAlerts = await prisma.leadAlert.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' }
      });

      return {
        leadId,
        alerts: allAlerts.map((alert: LeadAlert) => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          isAcknowledged: alert.isAcknowledged,
          relatedLeadId: alert.relatedLeadId || undefined,
          createdAt: alert.createdAt
        }))
      };

    } catch (error) {
      console.error('Error checking for duplicate alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  static async acknowledgeAlert(alertId: string, agentId: string): Promise<boolean> {
    try {
      const alert = await prisma.leadAlert.update({
        where: { id: alertId },
        data: {
          isAcknowledged: true,
          acknowledgedBy: agentId,
          acknowledgedAt: new Date()
        }
      });

      // Check if lead has any remaining active alerts
      const remainingAlerts = await prisma.leadAlert.count({
        where: {
          leadId: alert.leadId,
          isAcknowledged: false
        }
      });

      // Update lead flag if no more active alerts
      if (remainingAlerts === 0) {
        await prisma.lead.update({
          where: { id: alert.leadId },
          data: { hasActiveAlerts: false }
        });
      }

      return true;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Mark a lead as duplicate (when advocate sets disposition to DUPE)
   */
  static async markLeadAsDuplicate(leadId: string, advocateId: string): Promise<void> {
    try {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          isDuplicate: true,
          advocateId: advocateId,
          advocateReviewedAt: new Date()
        }
      });

      // Acknowledge any duplicate alerts for this lead
      await prisma.leadAlert.updateMany({
        where: {
          leadId: leadId,
          type: 'MBI_DUPLICATE',
          isAcknowledged: false
        },
        data: {
          isAcknowledged: true,
          acknowledgedBy: advocateId,
          acknowledgedAt: new Date()
        }
      });

      // Update hasActiveAlerts flag
      const remainingAlerts = await prisma.leadAlert.count({
        where: {
          leadId: leadId,
          isAcknowledged: false
        }
      });

      if (remainingAlerts === 0) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { hasActiveAlerts: false }
        });
      }

    } catch (error) {
      console.error('Error marking lead as duplicate:', error);
      throw error;
    }
  }

  /**
   * Get all active alerts for admin overview
   */
  static async getAllActiveAlerts(limit: number = 50): Promise<any[]> {
    try {
      const alerts = await prisma.leadAlert.findMany({
        where: { isAcknowledged: false },
        include: {
          lead: {
            select: {
              id: true,
              mbi: true,
              firstName: true,
              lastName: true,
              vendor: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      return alerts.map((alert: any) => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.createdAt,
        lead: {
          id: alert.lead.id,
          mbi: alert.lead.mbi,
          name: `${alert.lead.firstName} ${alert.lead.lastName}`,
          vendor: alert.lead.vendor.name
        },
        relatedLeadId: alert.relatedLeadId
      }));

    } catch (error) {
      console.error('Error fetching active alerts:', error);
      throw error;
    }
  }

  /**
   * Run bulk duplicate check on all existing leads
   */
  static async runBulkDuplicateCheck(): Promise<BulkCheckResult> {
    try {
      // Get all leads grouped by MBI
      const leadsByMbi = await prisma.lead.groupBy({
        by: ['mbi'],
        having: {
          mbi: {
            _count: {
              gt: 1
            }
          }
        },
        _count: {
          mbi: true
        }
      });

      let totalChecked = 0;
      let alertsCreated = 0;
      const duplicatesFound: Array<{ mbi: string; leadIds: string[] }> = [];

      // Process each group of duplicate MBIs
      for (const group of leadsByMbi) {
        const leads = await prisma.lead.findMany({
          where: { mbi: group.mbi },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            vendor: { select: { name: true } }
          },
          orderBy: { createdAt: 'asc' }
        });

        totalChecked += leads.length;
        duplicatesFound.push({
          mbi: group.mbi,
          leadIds: leads.map((lead: any) => lead.id)
        });

        // Create alerts for all leads except the first one (chronologically)
        const [firstLead, ...duplicateLeads] = leads;

        for (const duplicateLead of duplicateLeads) {
          // Check if alert already exists
          const existingAlert = await prisma.leadAlert.findFirst({
            where: {
              leadId: duplicateLead.id,
              type: 'MBI_DUPLICATE',
              relatedLeadId: firstLead.id
            }
          });

          if (!existingAlert) {
            await prisma.leadAlert.create({
              data: {
                leadId: duplicateLead.id,
                type: 'MBI_DUPLICATE',
                severity: 'HIGH',
                message: `Duplicate MBI detected: ${firstLead.firstName} ${firstLead.lastName} from ${firstLead.vendor.name} (submitted ${firstLead.createdAt.toLocaleDateString()})`,
                relatedLeadId: firstLead.id,
                metadata: {
                  duplicateLeadInfo: {
                    id: firstLead.id,
                    name: `${firstLead.firstName} ${firstLead.lastName}`,
                    vendor: firstLead.vendor.name,
                    submittedAt: firstLead.createdAt
                  }
                }
              }
            });

            // Update lead flags
            await prisma.lead.update({
              where: { id: duplicateLead.id },
              data: { hasActiveAlerts: true }
            });

            alertsCreated++;
          }
        }
      }

      return {
        checked: totalChecked,
        alertsCreated,
        duplicatesFound
      };

    } catch (error) {
      console.error('Error running bulk duplicate check:', error);
      throw error;
    }
  }
}
