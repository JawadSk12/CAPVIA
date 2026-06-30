import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify candidate authorization header from the gateway token (just basic auth check)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Bearer token required' }, { status: 401 });
    }

    // 2. Parse the multipart form data
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

    // 3. Define target directory and unique filename
    const uniqueId = crypto.randomUUID();
    const filename = `${uniqueId}.pdf`;
    
    // We are at frontend/src/app/api/resume/upload/route.ts
    // The target is frontend/public/resumes
    const targetDir = path.join(process.cwd(), 'public', 'resumes');
    
    // Ensure the directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, filename);

    // 4. Save the file to the public directory
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // 5. Construct and return the public URL
    // Use host header to dynamically determine the host/port
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.nextUrl.protocol || 'http:';
    const fileUrl = `${protocol}//${host}/resumes/${filename}`;

    console.log('[resume-upload proxy] Saved PDF locally:', filePath, '->', fileUrl);

    // Return the response format expected by ApplyButton
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
