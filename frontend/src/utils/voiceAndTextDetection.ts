/* eslint-disable @typescript-eslint/no-unused-vars */
import { EmotionScore } from './emotionDetection';

/**
 * 音声の感情分析をモック化した関数 (実際には音声録音＋解析ライブラリが必要)
 * ここではランダム生成で代用
 */
export async function detectVoiceEmotion(): Promise<EmotionScore> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const randomScore = createRandomEmotionScore();
      resolve(randomScore);
    }, 200); // 適当な処理時間
  });
}

/**
 * テキストの感情分析をモック化した関数 (実際にはNLPライブラリが必要)
 */
export async function detectTextEmotion(text: string): Promise<EmotionScore> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const randomScore = createRandomEmotionScore();
      resolve(randomScore);
    }, 300);
  });
}

// ランダムでEmotionScoreを生成
function createRandomEmotionScore(): EmotionScore {
  const randomVal = () => Math.random();
  const raw = {
    happy: randomVal(),
    sad: randomVal(),
    angry: randomVal(),
    surprised: randomVal(),
    neutral: randomVal(),
  };
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  // 正規化
  const emotions = {
    happy: raw.happy / sum,
    sad: raw.sad / sum,
    angry: raw.angry / sum,
    surprised: raw.surprised / sum,
    neutral: raw.neutral / sum,
  };

  return {
    timestamp: performance.now(),
    confidence: Math.random(),
    emotions,
  };
}