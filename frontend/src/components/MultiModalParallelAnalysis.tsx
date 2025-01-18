/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { detectEmotion, EmotionScore, initializeFaceDetector } from '@/utils/emotionDetection';
import { detectVoiceEmotion, detectTextEmotion } from '@/utils/voiceAndTextDetection';
import { ModalityScore, detectMultiModalEmotions } from '@/utils/multimodalAnalysis';
import SingleBestEmotionDisplay from './SingleBestEmotionDisplay';

export default function MultiModalParallelAnalysis() {
  // カメラ映像に使うref
  const webcamRef = useRef<Webcam>(null);

  // 初期化フラグ
  const [isInitialized, setIsInitialized] = useState(false);

  // モダリティの履歴
  const [multiModalHistory, setMultiModalHistory] = useState<ModalityScore[]>([]);

  // 最終的に表示する「単一の感情」
  const [bestEmotion, setBestEmotion] = useState<string>('');
  const [bestScore, setBestScore] = useState<number>(0);

  // ユーザーのテキスト入力（会話内容を想定）
  const [inputText, setInputText] = useState('');

  // カメラ映像の設定
  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user' as const,
  };

  // 初回マウントでFaceLandmarkerを初期化
  useEffect(() => {
    initializeFaceDetector().then(() => {
      setIsInitialized(true);
    });
  }, []);

  // 一定間隔(2秒に1回)で並列処理
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setInterval(() => {
      runParallelDetection();
    }, 2000);

    return () => clearInterval(timer);
  }, [isInitialized, inputText]);

  async function runParallelDetection() {
    if (!webcamRef.current?.video) return;

    try {
      // 3つのモダリティを並列に実行
      const [faceScore, voiceScore, textScore] = await Promise.all([
        detectEmotion(webcamRef.current.video), // カメラ映像
        detectVoiceEmotion(),                  // 音声 (モック)
        detectTextEmotion(inputText),          // テキスト (モック)
      ]);

      // どれかnullなら更新しない
      if (!faceScore || !voiceScore || !textScore) return;

      const newData: ModalityScore = {
        face: faceScore,
        voice: voiceScore,
        text: textScore,
      };

      // 履歴に追加 (適当に直近50件)
      setMultiModalHistory((prev) => [...prev, newData].slice(-50));

      // 移動平均 & 重み付けで合成
      const combined = detectMultiModalEmotions(
        [...multiModalHistory, newData],
        5, // windowSize
        { face: 0.4, voice: 0.3, text: 0.3 }
      );

      if (!combined) return;

      // 一番値が大きい感情を探す
      let maxKey = '';
      let maxVal = 0;
      for (const key in combined) {
        const val = combined[key as keyof typeof combined];
        if (val > maxVal) {
          maxVal = val;
          maxKey = key;
        }
      }

      setBestEmotion(maxKey);
      setBestScore(maxVal);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      {/* カメラ映像 */}
      <div className="max-w-2xl mx-auto">
        <Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstraints}
          className="rounded-lg bg-black"
        />
      </div>

      {/* テキスト入力 */}
      <div className="flex flex-col items-center space-y-2">
        <label className="text-white">会話内容:</label>
        <input
          className="p-2 rounded bg-gray-800 text-white"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="テキストを入力..."
        />
      </div>

      {/* 最適な感情1つだけ表示 */}
      <div className="flex justify-center">
        {bestEmotion && (
          <SingleBestEmotionDisplay
            emotionLabel={bestEmotion}
            confidence={bestScore}
          />
        )}
      </div>
    </div>
  );
}