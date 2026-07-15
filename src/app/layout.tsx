import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Họp Xong — Ghi âm cuộc họp, có báo cáo ngay',
  description: 'Biến nội dung cuộc họp thành tóm tắt, quyết định và đầu việc có thể theo dõi bằng AI.',
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
