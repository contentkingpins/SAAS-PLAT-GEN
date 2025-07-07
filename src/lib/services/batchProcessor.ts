import { prisma } from '@/lib/prisma';
import { FileUploadType } from '@prisma/client';

export interface ProcessingResult {
  succeeded: number;
  failed: number;
  errors: string[];
  data?: any;
}

export class BatchProcessor {
  // Process a single chunk for shipping report uploads
  static async processShippingReportChunk(
    chunk: any[],
    batchJobId: string
  ): Promise<ProcessingResult> {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Process each row in the chunk
      for (const row of chunk) {
        try {
          // Extract shipping data from row
          const shippingData = this.extractShippingData(row);
          
          if (!shippingData) {
            failed++;
            errors.push(`Row ${chunk.indexOf(row) + 1}: Missing required shipping data`);
            continue;
          }

          // Find matching lead using multiple strategies
          const lead = await this.findMatchingLead(shippingData);
          
          if (!lead) {
            failed++;
            errors.push(`Row ${chunk.indexOf(row) + 1}: No matching lead found for ${shippingData.name || shippingData.trackingNumber}`);
            continue;
          }

          // Update lead with shipping information
          await this.updateLeadWithShipping(lead.id, shippingData);
          succeeded++;

        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${chunk.indexOf(row) + 1}: ${errorMessage}`);
        }
      }

      return { succeeded, failed, errors };

    } catch (error) {
      // If there's a chunk-level error, mark all rows as failed
      return {
        succeeded: 0,
        failed: chunk.length,
        errors: [error instanceof Error ? error.message : 'Chunk processing failed']
      };
    }
  }

  // Process a single chunk for bulk lead uploads
  static async processBulkLeadChunk(
    chunk: any[],
    batchJobId: string
  ): Promise<ProcessingResult> {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Process each row in the chunk
      for (const row of chunk) {
        try {
          // Extract lead data from row
          const leadData = this.extractLeadData(row);
          
          if (!leadData) {
            failed++;
            errors.push(`Row ${chunk.indexOf(row) + 1}: Missing required lead data`);
            continue;
          }

          // Check for duplicates
          const existingLead = await prisma.lead.findUnique({
            where: { mbi: leadData.mbi }
          });

          if (existingLead) {
            failed++;
            errors.push(`Row ${chunk.indexOf(row) + 1}: Duplicate MBI ${leadData.mbi}`);
            continue;
          }

          // Create new lead
          await prisma.lead.create({
            data: leadData
          });
          succeeded++;

        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${chunk.indexOf(row) + 1}: ${errorMessage}`);
        }
      }

      return { succeeded, failed, errors };

    } catch (error) {
      return {
        succeeded: 0,
        failed: chunk.length,
        errors: [error instanceof Error ? error.message : 'Chunk processing failed']
      };
    }
  }

  // Process a single chunk for doctor approval uploads
  static async processDoctorApprovalChunk(
    chunk: any[],
    batchJobId: string
  ): Promise<ProcessingResult> {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      for (const row of chunk) {
        try {
          const approvalData = this.extractApprovalData(row);
          
          if (!approvalData) {
            failed++;
            errors.push(`Row ${chunk.indexOf(row) + 1}: Missing required approval data`);
            continue;
          }

          // Find matching lead
          const lead = await this.findLeadByMbiOrName(approvalData.mbi, approvalData.name);
          
          if (!lead) {
            failed++;
            errors.push(`Row ${chunk.indexOf(row) + 1}: No matching lead found`);
            continue;
          }

          // Update lead with approval status
          await this.updateLeadWithApproval(lead.id, approvalData);
          succeeded++;

        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${chunk.indexOf(row) + 1}: ${errorMessage}`);
        }
      }

      return { succeeded, failed, errors };

    } catch (error) {
      return {
        succeeded: 0,
        failed: chunk.length,
        errors: [error instanceof Error ? error.message : 'Chunk processing failed']
      };
    }
  }

  // Main processor dispatcher
  static async processChunk(
    uploadType: FileUploadType,
    chunk: any[],
    batchJobId: string
  ): Promise<ProcessingResult> {
    switch (uploadType) {
      case 'SHIPPING_REPORT':
        return this.processShippingReportChunk(chunk, batchJobId);
      case 'BULK_LEAD':
        return this.processBulkLeadChunk(chunk, batchJobId);
      case 'DOCTOR_APPROVAL':
        return this.processDoctorApprovalChunk(chunk, batchJobId);
      case 'KIT_RETURN':
        return this.processKitReturnChunk(chunk, batchJobId);
      case 'MASTER_DATA':
        return this.processMasterDataChunk(chunk, batchJobId);
      default:
        return {
          succeeded: 0,
          failed: chunk.length,
          errors: [`Unsupported upload type: ${uploadType}`]
        };
    }
  }

  // Helper methods for data extraction
  private static extractShippingData(row: any) {
    // Debug logging to see what headers and data we're getting
    console.log('🔍 DEBUG: Extracting shipping data from row:', Object.keys(row));
    console.log('🔍 DEBUG: First row sample:', row);
    
    const trackingNumber = row.packagetrackingnumber || row.tracking_number || row.trackingnumber;
    const name = row.shiptocompanyorname || row.name || row.patient_name;
    const address = row.shiptoaddress1 || row.address || row.address1;
    const city = row.shiptocityortown || row.city;
    const state = row.shiptostateprovincecounty || row.state;
    const zip = row.shiptopostalcode || row.zip || row.zipcode;
    const email = row.shiptoemailaddress || row.email;

    console.log('🔍 DEBUG: Extracted values:', {
      trackingNumber,
      name,
      address,
      city,
      state,
      zip,
      email
    });

    if (!trackingNumber || !name) {
      console.log('❌ DEBUG: Missing required fields - trackingNumber:', trackingNumber, 'name:', name);
      return null;
    }

    return {
      trackingNumber,
      name,
      address,
      city,
      state,
      zip,
      email
    };
  }

  private static extractLeadData(row: any) {
    const mbi = row.mbi || row.medicare_beneficiary_identifier;
    const firstName = row.firstname || row.first_name;
    const lastName = row.lastname || row.last_name;
    const phone = row.phone || row.phone_number;
    const dateOfBirth = row.dateofbirth || row.date_of_birth || row.dob;

    if (!mbi || !firstName || !lastName) {
      return null;
    }

    return {
      mbi,
      firstName,
      lastName,
      phone,
      dateOfBirth: new Date(dateOfBirth),
      street: row.street || row.address || '',
      city: row.city || '',
      state: row.state || '',
      zipCode: row.zipcode || row.zip || '',
      vendorId: row.vendorid || row.vendor_id,
      vendorCode: row.vendorcode || row.vendor_code,
      status: 'SUBMITTED' as const,
      testType: (row.testtype || row.test_type) as 'IMMUNE' | 'NEURO' | null
    };
  }

  private static extractApprovalData(row: any) {
    const mbi = row.mbi || row.medicare_beneficiary_identifier;
    const name = row.name || row.patient_name;
    const status = row.status || row.approval_status;

    if (!mbi || !status) {
      return null;
    }

    return {
      mbi,
      name,
      status: status.toUpperCase(),
      approvalDate: new Date()
    };
  }

  // Helper methods for database operations
  private static async findMatchingLead(shippingData: any) {
    // Try multiple matching strategies
    const strategies = [
      // Strategy 1: Match by tracking number if lead already has one
      () => prisma.lead.findFirst({
        where: { trackingNumber: shippingData.trackingNumber }
      }),
      
      // Strategy 2: Match by exact name
      () => prisma.lead.findFirst({
        where: {
          AND: [
            { firstName: { contains: shippingData.name.split(' ')[0], mode: 'insensitive' } },
            { lastName: { contains: shippingData.name.split(' ').slice(-1)[0], mode: 'insensitive' } }
          ]
        }
      }),
      
      // Strategy 3: Match by address
      () => prisma.lead.findFirst({
        where: {
          AND: [
            { city: { equals: shippingData.city, mode: 'insensitive' } },
            { state: { equals: shippingData.state, mode: 'insensitive' } },
            { zipCode: shippingData.zip }
          ]
        }
      })
    ];

    for (const strategy of strategies) {
      const lead = await strategy();
      if (lead) return lead;
    }

    return null;
  }

  private static async findLeadByMbiOrName(mbi: string, name?: string) {
    // Try MBI first
    let lead = await prisma.lead.findUnique({
      where: { mbi }
    });

    if (!lead && name) {
      // Try name match
      const nameParts = name.split(' ');
      lead = await prisma.lead.findFirst({
        where: {
          AND: [
            { firstName: { contains: nameParts[0], mode: 'insensitive' } },
            { lastName: { contains: nameParts.slice(-1)[0], mode: 'insensitive' } }
          ]
        }
      });
    }

    return lead;
  }

  private static async updateLeadWithShipping(leadId: string, shippingData: any) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        trackingNumber: shippingData.trackingNumber,
        status: 'SHIPPED',
        kitShippedDate: new Date(),
        // Assign to collections agent (simplified logic)
        collectionsAgentId: await this.getRandomCollectionsAgent(),
        collectionsNotes: `Shipped via UPS: ${shippingData.trackingNumber}`,
      }
    });
  }

  private static async updateLeadWithApproval(leadId: string, approvalData: any) {
    const statusMap: { [key: string]: 'APPROVED' | 'RETURNED' | 'SENT_TO_CONSULT' } = {
      'APPROVED': 'APPROVED',
      'DECLINED': 'RETURNED',
      'PENDING': 'SENT_TO_CONSULT'
    };

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: statusMap[approvalData.status] || 'SENT_TO_CONSULT',
        doctorApprovalStatus: approvalData.status,
        doctorApprovalDate: approvalData.approvalDate,
      }
    });
  }

  private static async getRandomCollectionsAgent() {
    const collectionsAgents = await prisma.user.findMany({
      where: { role: 'COLLECTIONS', isActive: true },
      select: { id: true }
    });

    if (collectionsAgents.length === 0) return null;
    
    return collectionsAgents[Math.floor(Math.random() * collectionsAgents.length)].id;
  }

  // Placeholder methods for other upload types
  private static async processKitReturnChunk(chunk: any[], batchJobId: string): Promise<ProcessingResult> {
    // Implementation for kit return processing
    return { succeeded: chunk.length, failed: 0, errors: [] };
  }

  private static async processMasterDataChunk(chunk: any[], batchJobId: string): Promise<ProcessingResult> {
    // Implementation for master data processing
    return { succeeded: chunk.length, failed: 0, errors: [] };
  }
} 