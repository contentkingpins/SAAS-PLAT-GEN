import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Find the batch job
    const batchJob = await prisma.batchJob.findFirst({
      where: {
        id: jobId,
        uploadedById: userId, // Users can only check their own jobs
      },
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!batchJob) {
      return NextResponse.json({ error: 'Batch job not found' }, { status: 404 });
    }

    // Calculate progress percentage
    const progressPercentage = batchJob.totalChunks > 0 
      ? Math.round((batchJob.chunksProcessed / batchJob.totalChunks) * 100)
      : 0;

    // Calculate time estimates
    const startTime = batchJob.startedAt?.getTime();
    const currentTime = Date.now();
    let estimatedTimeRemaining = null;
    let elapsedTime = null;

    if (startTime && batchJob.status === 'PROCESSING') {
      elapsedTime = Math.round((currentTime - startTime) / 1000); // seconds
      
      if (batchJob.chunksProcessed > 0) {
        const timePerChunk = elapsedTime / batchJob.chunksProcessed;
        const remainingChunks = batchJob.totalChunks - batchJob.chunksProcessed;
        estimatedTimeRemaining = Math.round(remainingChunks * timePerChunk);
      }
    }

    // Format response
    const response = {
      id: batchJob.id,
      type: batchJob.type,
      fileName: batchJob.fileName,
      status: batchJob.status,
      
      // Progress information
      totalRows: batchJob.totalRows,
      totalChunks: batchJob.totalChunks,
      chunksProcessed: batchJob.chunksProcessed,
      progressPercentage,
      progressMessage: batchJob.progressMessage,
      
      // Record counts
      recordsProcessed: batchJob.recordsProcessed,
      recordsSucceeded: batchJob.recordsSucceeded,
      recordsFailed: batchJob.recordsFailed,
      
      // Timestamps
      createdAt: batchJob.createdAt,
      startedAt: batchJob.startedAt,
      completedAt: batchJob.completedAt,
      
      // Time estimates
      elapsedTime: elapsedTime ? `${elapsedTime}s` : null,
      estimatedTimeRemaining: estimatedTimeRemaining ? `${estimatedTimeRemaining}s` : null,
      
      // Error information
      errorLog: batchJob.errorLog,
      
      // User information
      uploadedBy: batchJob.uploadedBy,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching batch job status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch batch job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for listing all batch jobs for a user
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await request.json();
    const { action } = body;

    // Get user from headers (set by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Find the batch job
    const batchJob = await prisma.batchJob.findFirst({
      where: {
        id: jobId,
        uploadedById: userId,
      },
    });

    if (!batchJob) {
      return NextResponse.json({ error: 'Batch job not found' }, { status: 404 });
    }

    // Handle different actions
    switch (action) {
      case 'cancel':
        if (batchJob.status === 'PROCESSING' || batchJob.status === 'PENDING') {
          await prisma.batchJob.update({
            where: { id: jobId },
            data: {
              status: 'CANCELLED',
              completedAt: new Date(),
              progressMessage: 'Batch job cancelled by user',
            },
          });
          return NextResponse.json({ success: true, message: 'Batch job cancelled' });
        } else {
          return NextResponse.json({ error: 'Cannot cancel completed batch job' }, { status: 400 });
        }

      case 'retry':
        if (batchJob.status === 'FAILED') {
          await prisma.batchJob.update({
            where: { id: jobId },
            data: {
              status: 'PENDING',
              chunksProcessed: 0,
              recordsProcessed: 0,
              recordsSucceeded: 0,
              recordsFailed: 0,
              errorLog: null,
              progressMessage: 'Batch job queued for retry',
              startedAt: null,
              completedAt: null,
            },
          });
          return NextResponse.json({ success: true, message: 'Batch job queued for retry' });
        } else {
          return NextResponse.json({ error: 'Can only retry failed batch jobs' }, { status: 400 });
        }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error handling batch job action:', error);
    return NextResponse.json({ 
      error: 'Failed to handle batch job action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 