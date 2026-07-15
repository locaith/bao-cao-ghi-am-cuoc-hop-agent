import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-4 text-center">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-gray-600 mb-6">Không tìm thấy trang yêu cầu</p>
      <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
        Quay lại trang chủ
      </Link>
    </div>
  );
}
