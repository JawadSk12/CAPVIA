import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { jwtVerify } from 'jose';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify candidate authorization header and cryptographically validate JWT signature
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Bearer token required' }, { status: 401 });
    }
    const token = authHeader.substring(7);

    try {
      const secret = new TextEncoder().encode(process.env.SECRET_KEY || 'test_secret_for_interview_integration');
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      if (!payload.sub) {
        return NextResponse.json({ error: 'Forbidden: Invalid token claims' }, { status: 403 });
      }
    } catch (jwtErr: any) {
      console.error('[resume-upload proxy] JWT validation failed:', jwtErr.message);
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token signature' }, { status: 401 });
    }

    // 2. Parse and validate the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }
    
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    // 3. Buffer array verification: Magic bytes & PDF structural integrity check
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfHeader = buffer.toString('utf-8', 0, 5);
    const pdfBodyString = buffer.toString('utf-8');
    
    if (pdfHeader !== '%PDF-' || !pdfBodyString.includes('%%EOF')) {
      return NextResponse.json({ error: 'Invalid file format: Corrupted or malformed PDF structure' }, { status: 400 });
    }

    // 4. Define target directory and unique filename
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}.pdf`;
    const targetDir = path.join(process.cwd(), 'public', 'resumes');
    
    // Ensure the directory exists asynchronously or checks if exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);

    // 5. Save the file asynchronously using promises to keep Next.js event loop non-blocking
    await fsPromises.writeFile(filePath, buffer);

    // 6. Construct and return the public URL
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.nextUrl.protocol || 'http:';
    const fileUrl = `${protocol}//${host}/resumes/${filename}`;

    console.log('[resume-upload proxy] Saved PDF asynchronously:', filePath, '->', fileUrl);

    return NextResponse.json({
      resume_id: uniqueId,
      resume_url: fileUrl,
      file_url: fileUrl,
      status: 'UPLOADED',
      message: 'Resume uploaded successfully'
    });
  } catch (err: any) {
    console.error('[resume-upload proxy] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
