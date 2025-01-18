// frontend/src/components/SingleBestEmotionDisplay.tsx
'use client';

import React from 'react';

/** props: 単一の感情ラベル＋そのスコア(0~1) */
interface SingleBestEmotionDisplayProps {
  emotionLabel: string;
  confidence: number;
}

export default function SingleBestEmotionDisplay({
  emotionLabel,
  confidence,
}: SingleBestEmotionDisplayProps) {
  return (
    <div className="p-4 bg-gray-800/80 rounded-lg flex flex-col items-center justify-center">
      <p className="text-white text-xl">現在の感情</p>
      <p className="text-white text-2xl font-bold mt-2">
        {translateEmotion(emotionLabel)}
      </p>
      <p className="text-gray-300 mt-1">
        確信度: {(confidence * 100).toFixed(1)}%
      </p>
    </div>
  );
}

/** 感情ラベルを日本語に変換 (例) */
function translateEmotion(label: string): string {
  switch (label) {
    case 'happy':
      return '喜び';
    case 'sad':
      return '悲しみ';
    case 'angry':
      return '怒り';
    case 'surprised':
      return '驚き';
    case 'neutral':
      return '無表情';
    default:
      return label; // 未定義はそのまま
  }
}