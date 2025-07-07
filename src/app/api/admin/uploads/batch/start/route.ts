import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import Papa from 'papaparse';
import { BatchProcessor } from '@/lib/services/batchProcessor';

// Validation schema for the request
const startBatchSchema = z.object({
  uploadType: z.enum(['BULK_LEAD', 'DOCTOR_APPROVAL', 'SHIPPING_REPORT', 'KIT_RETURN', 'MASTER_DATA']),
  fileName: z.string(),
  fileContent: z.string(), // Base64 encoded file content
});

// Configuration for different upload types
const UPLOAD_CONFIG = {
  BULK_LEAD: { chunkSize: 500, processingTime: 10 },
  DOCTOR_APPROVAL: { chunkSize: 1000, processingTime: 5 },
  SHIPPING_REPORT: { chunkSize: 100, processingTime: 30 }, // Smaller chunks for complex processing
  KIT_RETURN: { chunkSize: 1000, processingTime: 5 },
  MASTER_DATA: { chunkSize: 500, processingTime: 15 },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadType, fileName, fileContent } = startBatchSchema.parse(body);

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Decode and parse CSV content
    const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8');
    const parseResult = Papa.parse(csvContent, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase()
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid CSV file', 
        details: parseResult.errors 
      }, { status: 400 });
    }

    const totalRows = parseResult.data.length;
    const config = UPLOAD_CONFIG[uploadType];
    const totalChunks = Math.ceil(totalRows / config.chunkSize);

    // Store file content (in production, this would be uploaded to S3 or similar)
    const fileUrl = `temp://${Date.now()}-${fileName}`;

    // Create batch job record
    const batchJob = await prisma.batchJob.create({
      data: {
        type: uploadType,
        fileName,
        fileUrl,
        uploadedById: userId,
        totalRows,
        totalChunks,
        status: 'PENDING',
        progressMessage: 'Batch job created, preparing to process...',
      },
    });

    // In a real production environment, you would trigger a background job here
    // For now, we'll start processing immediately in the background
    processBatchJobAsync(batchJob.id, csvContent, config);

    return NextResponse.json({
      success: true,
      batchJobId: batchJob.id,
      message: `Batch job started for ${totalRows} rows in ${totalChunks} chunks`,
      estimatedTime: `${Math.ceil(totalChunks * config.processingTime / 60)} minutes`,
    });

  } catch (error) {
    console.error('Error starting batch job:', error);
    return NextResponse.json({ 
      error: 'Failed to start batch job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Async function to process batch job (this would be a separate service in production)
async function processBatchJobAsync(
  batchJobId: string, 
  csvContent: string,
  config: { chunkSize: number; processingTime: number }
) {
  try {
    // Update status to processing
    await prisma.batchJob.update({
      where: { id: batchJobId },
      data: { 
        status: 'PROCESSING',
        startedAt: new Date(),
        progressMessage: 'Starting batch processing...'
      }
    });

    // Parse CSV again for processing
    const parseResult = Papa.parse(csvContent, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase()
    });

    const rows = parseResult.data;
    const chunks = [];
    
    // Split into chunks
    for (let i = 0; i < rows.length; i += config.chunkSize) {
      chunks.push(rows.slice(i, i + config.chunkSize));
    }

    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    const errorLog: any[] = [];

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      try {
        // Update progress
        await prisma.batchJob.update({
          where: { id: batchJobId },
          data: {
            chunksProcessed: chunkIndex + 1,
            progressMessage: `Processing chunk ${chunkIndex + 1} of ${chunks.length}...`
          }
        });

        // Process chunk (this would call the actual upload processing logic)
        const result = await processChunk(chunk, batchJobId);
        
        totalProcessed += chunk.length;
        totalSucceeded += result.succeeded;
        totalFailed += result.failed;
        
        if (result.errors.length > 0) {
          errorLog.push({
            chunkIndex,
            errors: result.errors
          });
        }

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing chunk ${chunkIndex}:`, error);
        totalFailed += chunk.length;
        errorLog.push({
          chunkIndex,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    // Update final status
    await prisma.batchJob.update({
      where: { id: batchJobId },
      data: {
        status: totalFailed > 0 ? 'COMPLETED' : 'COMPLETED', // You might want 'PARTIAL' status
        completedAt: new Date(),
        recordsProcessed: totalProcessed,
        recordsSucceeded: totalSucceeded,
        recordsFailed: totalFailed,
        errorLog: errorLog.length > 0 ? errorLog : null,
        progressMessage: `Completed: ${totalSucceeded} succeeded, ${totalFailed} failed`
      }
    });

  } catch (error) {
    console.error('Error in batch processing:', error);
    await prisma.batchJob.update({
      where: { id: batchJobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorLog: [{
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        progressMessage: 'Batch processing failed'
      }
    });
  }
}

// Process a single chunk using the BatchProcessor service
async function processChunk(chunk: any[], batchJobId: string) {
  // Get the batch job to determine the upload type
  const batchJob = await prisma.batchJob.findUnique({
    where: { id: batchJobId },
    select: { type: true }
  });

  if (!batchJob) {
    throw new Error('Batch job not found');
  }

  // Use the BatchProcessor service to process the chunk
  return await BatchProcessor.processChunk(batchJob.type, chunk, batchJobId);
} 