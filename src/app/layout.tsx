import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemoAI — Biên bản họp thành hành động',
  description: 'Ghi âm, tóm tắt và theo dõi đầu việc sau cuộc họp bằng AI.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
