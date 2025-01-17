'use client';

import { EmotionScore } from '@/utils/emotionDetection';

interface EmotionDisplayProps {
  emotions: EmotionScore['emotions'];
}

const EmotionDisplay = ({ emotions }: EmotionDisplayProps) => {
  return (
    <div className="grid grid-cols-1 gap-2 p-4 bg-gray-800/80 backdrop-blur rounded-lg">
      {Object.entries(emotions).map(([emotion, score]) => (
        <div key={emotion} className="relative">
          <div className="flex justify-between text-sm mb-1">
            <span className="capitalize text-gray-200">
              {emotion === 'happy' && '喜び'}
              {emotion === 'sad' && '悲しみ'}
              {emotion === 'angry' && '怒り'}
              {emotion === 'surprised' && '驚き'}
              {emotion === 'neutral' && '無表情'}
            </span>
            <span className="text-gray-300">{(score * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${getEmotionColor(emotion)}`}
              style={{ width: `${score * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

function getEmotionColor(emotion: string): string {
  const colors = {
    happy: 'bg-green-500',
    sad: 'bg-blue-500',
    angry: 'bg-red-500',
    surprised: 'bg-yellow-500',
    neutral: 'bg-gray-500'
  };
  return colors[emotion as keyof typeof colors] || 'bg-gray-500';
}

export default EmotionDisplay;