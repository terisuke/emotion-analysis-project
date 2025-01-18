// frontend/src/components/CameraStream.tsx

'use client';

import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import {
  detectEmotion,
  EmotionScore,
  initializeFaceDetector,
} from '@/utils/emotionDetection';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SingleBestEmotionDisplay from './SingleBestEmotionDisplay'; // 追加

/**
 * 最も値が大きい感情を取り出すヘルパー関数
 */
function getDominantEmotion(emotions: Record<string, number>) {
  let bestEmotion = '';
  let bestScore = 0;
  for (const [key, value] of Object.entries(emotions)) {
    if (value > bestScore) {
      bestScore = value;
      bestEmotion = key;
    }
  }
  return { emotion: bestEmotion, score: bestScore };
}

const CameraStream = () => {
  const webcamRef = useRef<Webcam>(null);
  const requestAnimationFrameRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // 現在の感情 & 履歴
  const [emotionScore, setEmotionScore] = useState<EmotionScore | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionScore[]>([]);

  // カメラ設定
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  // --- WebSocket接続 ---
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received data:', data);

        // 最新の感情を保存
        setEmotionScore(data);

        // 履歴にも追加 (max 30)
        setEmotionHistory((prev) => {
          const newHistory = [...prev, data];
          return newHistory.slice(-30);
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // WebSocket 送信
  const sendEmotionData = (data: EmotionScore) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const formattedData = {
        ...data,
        timestamp: performance.now(),
      };
      console.log('Sending data:', formattedData);
      wsRef.current.send(JSON.stringify(formattedData));
    }
  };

  // カメラが初期化されたら、video.readyState が 4になるのを待つ
  useEffect(() => {
    let checkVideoInterval: NodeJS.Timeout;
    if (isInitialized && webcamRef.current && webcamRef.current.video) {
      checkVideoInterval = setInterval(() => {
        const video = webcamRef.current?.video;
        if (video && video.readyState === 4) {
          setIsVideoReady(true);
          clearInterval(checkVideoInterval);
        }
      }, 100);
    }

    return () => {
      if (checkVideoInterval) {
        clearInterval(checkVideoInterval);
      }
    };
  }, [isInitialized]);

  // 感情分析ループ
  const detectEmotionLoop = async () => {
    if (webcamRef.current?.video) {
      try {
        // 1フレーム分の感情を分析
        const score = await detectEmotion(webcamRef.current.video);
        if (score) {
          // バックエンドへ送信
          sendEmotionData(score);
        }
      } catch (error) {
        console.error('Error detecting emotion:', error);
      }
    }
    requestAnimationFrameRef.current = requestAnimationFrame(detectEmotionLoop);
  };

  // カメラ映像が準備できたら分析開始
  useEffect(() => {
    if (isVideoReady) {
      initializeFaceDetector().then(() => {
        detectEmotionLoop();
      });
    }
    return () => {
      if (requestAnimationFrameRef.current) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
    };
  }, [isVideoReady]);

  // カメラ使用可能になった時のコールバック
  const handleUserMedia = () => {
    setIsInitialized(true);
  };

  return (
    <div className="space-y-4">
      {/* カメラ映像 */}
      <div className="relative w-full max-w-2xl mx-auto bg-gray-900 rounded-lg overflow-hidden">
        {/* カメラ初期化中オーバーレイ */}
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <p className="text-white">カメラを初期化中...</p>
          </div>
        )}

        <Webcam
          ref={webcamRef}
          audio={false}
          width={640}
          height={480}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          className="rounded-lg shadow-lg"
          mirrored
        />

        {/* 右上に単一の感情だけ表示 (棒グラフ→単一表示へ変更) */}
        {emotionScore && (
          <div className="absolute top-4 right-4 w-64">
            {/** 最もスコアが高い感情を取り出す */}
            {(() => {
              const { emotion, score } = getDominantEmotion(emotionScore.emotions);
              return (
                <SingleBestEmotionDisplay
                  emotionLabel={emotion}
                  confidence={score}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* 下の折れ線グラフはそのまま */}
      {emotionHistory.length > 0 && (
        <div className="w-full h-64 bg-gray-900 rounded-lg p-4">
          <ResponsiveContainer key={emotionHistory.length}>
            <LineChart data={emotionHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="emotions.happy"
                name="喜び"
                stroke="#4ade80"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="emotions.sad"
                name="悲しみ"
                stroke="#60a5fa"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="emotions.angry"
                name="怒り"
                stroke="#ef4444"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="emotions.surprised"
                name="驚き"
                stroke="#fbbf24"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="emotions.neutral"
                name="無表情"
                stroke="#94a3b8"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CameraStream;