import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Meeting AI Recorder & Planner',
  description: 'Ghi âm cuộc họp, tóm tắt tự động bằng AI, quản lý công việc và đồng bộ lịch Google Calendar.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full antialiased bg-gray-50 text-gray-900 transition-colors duration-300" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
