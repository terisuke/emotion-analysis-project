'use client';

import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import {
  detectEmotion,
  EmotionScore,
  initializeFaceDetector,
} from '@/utils/emotionDetection';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import SingleBestEmotionDisplay from './SingleBestEmotionDisplay';

/** 
 * 簡易的なポップアップを表示するコンポーネント
 * （適宜デザインを整えてください）
 */
function AlertPopup({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-sm w-full">
        <p className="text-gray-800 mb-4">{message}</p>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

/** 最も値が高い感情を取り出すヘルパー関数 */
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

export default function CameraStream() {
  const webcamRef = useRef<Webcam>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const requestAnimationFrameRef = useRef<number | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // 現在の感情 & 履歴
  const [emotionScore, setEmotionScore] = useState<EmotionScore | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionScore[]>([]);

  // 【追加】アラートメッセージのState
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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

        // もし type=alert なら、ポップアップを表示
        if (data.type === 'alert') {
          console.log('[ALERT] =>', data.message);
          setAlertMessage(data.message); // ポップアップに表示
          return;
        }

        // 通常の感情スコアデータ
        setEmotionScore(data);
        setEmotionHistory((prev) => {
          const newHistory = [...prev, data];
          return newHistory.slice(-30); // 最新30件だけ
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

  // カメラが初期化されたら video.readyState が 4になるのを待つ
  useEffect(() => {
    let checkVideoInterval: NodeJS.Timeout;
    if (isInitialized && webcamRef.current?.video) {
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

  // ポップアップ「閉じる」時のハンドラ
  const handleCloseAlert = () => {
    setAlertMessage(null);
  };

  return (
    <div className="space-y-4">
      {/* カメラ映像 */}
      <div className="relative w-full max-w-2xl mx-auto bg-gray-900 rounded-lg overflow-hidden">
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

        {/* 右上に最もスコアが高い感情だけ表示 */}
        {emotionScore && (
          <div className="absolute top-4 right-4 w-64">
            {(() => {
              const { emotion, score } = getDominantEmotion(
                emotionScore.emotions
              );
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

      {/* 下の折れ線グラフ */}
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

      {/* アラートポップアップの描画 (alertMessageがある時だけ) */}
      {alertMessage && (
        <AlertPopup message={alertMessage} onClose={handleCloseAlert} />
      )}
    </div>
  );
}