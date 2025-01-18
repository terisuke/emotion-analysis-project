import { EmotionScore } from './emotionDetection';

/**
 * EmotionScoreの配列から「単純平均」を求める関数
 * 例えば直近10件のhappyを足して割る → averageEmotions.happy
 * confidence も平均を取る
 */
export function calculateAverageEmotion(history: EmotionScore[]): EmotionScore {
  if (history.length === 0) {
    // 空配列の場合、全部0を返す
    return {
      timestamp: 0,
      confidence: 0,
      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        surprised: 0,
        neutral: 0,
      },
    };
  }

  const length = history.length;
  let totalConfidence = 0;
  const sums = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    neutral: 0,
  };

  // 合計を計算
  history.forEach((item) => {
    totalConfidence += item.confidence;
    sums.happy += item.emotions.happy;
    sums.sad += item.emotions.sad;
    sums.angry += item.emotions.angry;
    sums.surprised += item.emotions.surprised;
    sums.neutral += item.emotions.neutral;
  });

  // 平均を返す
  return {
    timestamp: history[history.length - 1].timestamp,
    confidence: totalConfidence / length,
    emotions: {
      happy: sums.happy / length,
      sad: sums.sad / length,
      angry: sums.angry / length,
      surprised: sums.surprised / length,
      neutral: sums.neutral / length,
    },
  };
}

/**
 * emotionsオブジェクト { happy:0.2, sad:0.1,...} の中で一番大きいスコアを持つ感情を返す
 */
export function getDominantEmotion(
  emotions: { [key: string]: number }
): { emotion: string; score: number } {
  let maxEmotion = '';
  let maxScore = 0;

  for (const [key, value] of Object.entries(emotions)) {
    if (value > maxScore) {
      maxScore = value;
      maxEmotion = key;
    }
  }

  return { emotion: maxEmotion, score: maxScore };
}