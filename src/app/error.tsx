'use client';

import React from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-4 text-center">
      <h1 className="text-4xl font-bold mb-2">Đã có lỗi xảy ra</h1>
      <p className="text-gray-600 mb-6">Chúng tôi xin lỗi vì sự bất tiện này.</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Thử lại
      </button>
    </div>
  );
}
