import { EmotionScore } from './emotionDetection';

/**
 * 各モダリティそれぞれで EmotionScore を持つ
 */
export interface ModalityScore {
  face: EmotionScore;
  voice: EmotionScore;
  text: EmotionScore;
}

/**
 * 複数モダリティの直近 N 個を移動平均し、その平均を重み付けで合成する
 * ここでは例として:
 *   face: 0.4
 *   voice: 0.3
 *   text: 0.3
 */
export function detectMultiModalEmotions(
  history: ModalityScore[],
  windowSize = 5,
  weights = { face: 0.4, voice: 0.3, text: 0.3 }
) {
  if (history.length === 0) return null;

  // 1. 直近windowSize件を抜き出す
  const windowData = history.slice(-windowSize);

  // 2. 各モダリティの平均を計算
  const avgFace = averageEmotionScore(windowData.map((x) => x.face));
  const avgVoice = averageEmotionScore(windowData.map((x) => x.voice));
  const avgText = averageEmotionScore(windowData.map((x) => x.text));

  // 3. 重み付けで合成
  const combined = {
    happy:
      avgFace.emotions.happy * weights.face +
      avgVoice.emotions.happy * weights.voice +
      avgText.emotions.happy * weights.text,
    sad:
      avgFace.emotions.sad * weights.face +
      avgVoice.emotions.sad * weights.voice +
      avgText.emotions.sad * weights.text,
    angry:
      avgFace.emotions.angry * weights.face +
      avgVoice.emotions.angry * weights.voice +
      avgText.emotions.angry * weights.text,
    surprised:
      avgFace.emotions.surprised * weights.face +
      avgVoice.emotions.surprised * weights.voice +
      avgText.emotions.surprised * weights.text,
    neutral:
      avgFace.emotions.neutral * weights.face +
      avgVoice.emotions.neutral * weights.voice +
      avgText.emotions.neutral * weights.text,
  };

  // 正規化しておく
  const sum = Object.values(combined).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const key in combined) {
      combined[key as keyof typeof combined] /= sum;
    }
  }

  return combined;
}

/**
 * EmotionScoreの平均を取るヘルパー
 */
function averageEmotionScore(scores: EmotionScore[]): EmotionScore {
  if (scores.length === 0) {
    return {
      timestamp: 0,
      confidence: 0,
      emotions: { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0 },
    };
  }

  const length = scores.length;
  let totalConfidence = 0;
  const sums = {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    neutral: 0,
  };

  for (const item of scores) {
    totalConfidence += item.confidence;
    sums.happy += item.emotions.happy;
    sums.sad += item.emotions.sad;
    sums.angry += item.emotions.angry;
    sums.surprised += item.emotions.surprised;
    sums.neutral += item.emotions.neutral;
  }

  return {
    timestamp: scores[scores.length - 1].timestamp,
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