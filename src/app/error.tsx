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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f3ed] text-[#11120f] p-4 text-center">
      <p className="text-xs tracking-[.2em] mb-4">MEMO/AI</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-2">Phiên làm việc bị gián đoạn</h1>
      <p className="text-stone-500 mb-6">Dữ liệu đã lưu vẫn an toàn. Anh có thể tải lại giao diện.</p>
      <button
        onClick={() => reset()}
        className="px-5 py-3 bg-[#11120f] text-white hover:bg-[#2b2c27] transition"
      >
        Thử lại
      </button>
    </div>
  );
}
