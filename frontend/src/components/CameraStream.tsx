'use client';

import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { detectEmotion, EmotionScore, initializeFaceDetector } from '@/utils/emotionDetection';
import EmotionDisplay from './EmotionDisplay';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CameraStream = () => {
  const webcamRef = useRef<Webcam>(null);
  const requestAnimationFrameRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // カメラ／分析の状態管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // 感情スコアの履歴
  const [emotionScore, setEmotionScore] = useState<EmotionScore | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionScore[]>([]);

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user',
  };

  useEffect(() => {
    // WebSocket接続を確立
    const ws = new WebSocket('ws://localhost:8080/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received data:', data); // 受信データのログ

        // 受信したデータをStateに反映 -> 再レンダー
        setEmotionScore(data);
        setEmotionHistory((prev) => {
          // 新しい配列を返す
          const newHistory = [...prev, data];
          return newHistory.slice(-30); // 最新30個だけ保持
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

  // WebSocketに感情データを送る関数
  const sendEmotionData = (data: EmotionScore) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const formattedData = {
        ...data,
        timestamp: performance.now(),
      };
      console.log('Sending data:', formattedData); // 送信データのログ
      wsRef.current.send(JSON.stringify(formattedData));
    }
  };

  // ビデオが "初期化済み & readyState=4" になったかを監視
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
        const score = await detectEmotion(webcamRef.current.video);
        if (score) {
          // フロントエンド→バックエンドへ送信
          sendEmotionData(score);
        }
      } catch (error) {
        console.error('Error detecting emotion:', error);
      }
    }
    requestAnimationFrameRef.current = requestAnimationFrame(detectEmotionLoop);
  };

  // ビデオ準備完了したら分析を開始
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

  const handleUserMedia = () => {
    setIsInitialized(true);
  };

  return (
    <div className="space-y-4">
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
          mirrored={true}
        />

        {emotionScore && (
          <div className="absolute top-4 right-4 w-64">
            <EmotionDisplay emotions={emotionScore.emotions} />
          </div>
        )}
      </div>

      {emotionHistory.length > 0 && (
        <div className="w-full h-64 bg-gray-900 rounded-lg p-4">
          <ResponsiveContainer
            // ポイント: キーを変えることで強制的に再描画を誘発する手法
            key={emotionHistory.length}
          >
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