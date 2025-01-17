'use client';

import dynamic from 'next/dynamic';

// WebカメラコンポーネントをSSRなしで動的にインポート
const CameraStream = dynamic(() => import('./CameraStream'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
      <p className="text-white">カメラを読み込み中...</p>
    </div>
  ),
});

export default function EmotionAnalysis() {
  return (
    <div className="w-full max-w-4xl mx-auto h-screen flex items-center justify-center">
      <div className="w-full h-full p-4 flex flex-col justify-center">
        <CameraStream />
      </div>
    </div>
  );
}