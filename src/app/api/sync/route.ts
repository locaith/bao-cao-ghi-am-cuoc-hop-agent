import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Store backups in /tmp because it is writable on Cloud Run.
const BACKUP_DIR = '/tmp/meeting_ai_backups';

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const getFilePath = (email: string) => {
  // Sanitize email to create a safe file name
  const safeEmail = email.toLowerCase().replace(/[^a-z0-9]/gi, '_');
  return path.join(BACKUP_DIR, `sync_${safeEmail}.json`);
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Thiếu email người dùng' }, { status: 400 });
    }

    const filePath = getFilePath(email);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        message: 'Chưa có bản sao lưu đám mây cho tài khoản này.',
        meetings: [],
        tasks: [],
        lastBackup: null,
      });
    }

    const data = fs.readFileSync(filePath, 'utf-8');
    const parsedData = JSON.parse(data);

    return NextResponse.json({
      message: 'Tải bản sao lưu thành công.',
      meetings: parsedData.meetings || [],
      tasks: parsedData.tasks || [],
      lastBackup: parsedData.lastBackup || null,
    });
  } catch (error: any) {
    console.error('Lỗi khi tải sao lưu:', error);
    return NextResponse.json({ error: 'Không thể tải bản sao lưu từ đám mây.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, meetings, tasks } = body;

    if (!email) {
      return NextResponse.json({ error: 'Thiếu email người dùng' }, { status: 400 });
    }

    const filePath = getFilePath(email);
    const lastBackup = new Date().toISOString();

    const backupData = {
      email,
      meetings: meetings || [],
      tasks: tasks || [],
      lastBackup,
    };

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Đồng bộ đám mây thành công!',
      lastBackup,
    });
  } catch (error: any) {
    console.error('Lỗi khi sao lưu dữ liệu:', error);
    return NextResponse.json({ error: 'Không thể lưu bản sao lưu đám mây.' }, { status: 500 });
  }
}
