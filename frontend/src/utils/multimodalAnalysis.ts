/* eslint-disable @typescript-eslint/no-unused-vars */
/* 
  このファイルで、「複数モダリティの感情分析」や「移動平均との比較」をまとめて実装します。
*/

export interface SingleEmotionScore {
  timestamp: number;
  confidence: number;
  emotions: {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    neutral: number;
  };
}

export interface ModalityScore {
  face: SingleEmotionScore;
  voice: SingleEmotionScore;
  text: SingleEmotionScore;
}

/**
 * 1. 各モダリティの「平均スコア（emotions全体）」を計算する。
 */
function calculateModalityAverage(
  history: ModalityScore[],
  modality: keyof ModalityScore
): SingleEmotionScore["emotions"] {
  if (history.length === 0) {
    return { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0 };
  }

  const length = history.length;

  // 各モダリティの感情スコアを合計
  const total = history.reduce(
    (acc, item) => {
      const emo = item[modality].emotions;
      return {
        happy: acc.happy + emo.happy,
        sad: acc.sad + emo.sad,
        angry: acc.angry + emo.angry,
        surprised: acc.surprised + emo.surprised,
        neutral: acc.neutral + emo.neutral,
      };
    },
    { happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0 }
  );

  // 平均を返す
  return {
    happy: total.happy / length,
    sad: total.sad / length,
    angry: total.angry / length,
    surprised: total.surprised / length,
    neutral: total.neutral / length,
  };
}

/**
 * 2. 最新のスコアを各モダリティの重み付きで合算し、最終スコアを出す
 */
function combineModalityScores(
  latest: ModalityScore,
  weights: { face: number; voice: number; text: number }
): SingleEmotionScore["emotions"] {
  const face = latest.face.emotions;
  const voice = latest.voice.emotions;
  const text = latest.text.emotions;

  return {
    happy:
      face.happy * weights.face +
      voice.happy * weights.voice +
      text.happy * weights.text,
    sad:
      face.sad * weights.face +
      voice.sad * weights.voice +
      text.sad * weights.text,
    angry:
      face.angry * weights.face +
      voice.angry * weights.voice +
      text.angry * weights.text,
    surprised:
      face.surprised * weights.face +
      voice.surprised * weights.voice +
      text.surprised * weights.text,
    neutral:
      face.neutral * weights.face +
      voice.neutral * weights.voice +
      text.neutral * weights.text,
  };
}

/**
 * 3. 過去の移動平均も各モダリティの重み付きで合算する
 */
function combineModalityAverages(
  modalityAverages: { face: SingleEmotionScore["emotions"]; voice: SingleEmotionScore["emotions"]; text: SingleEmotionScore["emotions"] },
  weights: { face: number; voice: number; text: number }
): SingleEmotionScore["emotions"] {
  const face = modalityAverages.face;
  const voice = modalityAverages.voice;
  const text = modalityAverages.text;

  return {
    happy:
      face.happy * weights.face +
      voice.happy * weights.voice +
      text.happy * weights.text,
    sad:
      face.sad * weights.face +
      voice.sad * weights.voice +
      text.sad * weights.text,
    angry:
      face.angry * weights.face +
      voice.angry * weights.voice +
      text.angry * weights.text,
    surprised:
      face.surprised * weights.face +
      voice.surprised * weights.voice +
      text.surprised * weights.text,
    neutral:
      face.neutral * weights.face +
      voice.neutral * weights.voice +
      text.neutral * weights.text,
  };
}

/**
 * 4. 最新のcombinedEmotions と 過去のcombinedAverages を比較し、顕著に変化がある感情をハイライトする
 */
function detectSignificantDeviations(
  combinedEmotions: SingleEmotionScore["emotions"],
  combinedAverages: SingleEmotionScore["emotions"],
  threshold = 0.05
) {
  // threshold: 移動平均との差がどのくらい大きければ「顕著な変化」とみなすか
  const deviations: Record<string, number> = {};

  // 例： (latest - avg)がthresholdより大きければ「ポジティブ変化」、小さければ「ネガティブ変化」
  for (const key in combinedEmotions) {
    const diff = combinedEmotions[key as keyof typeof combinedEmotions] -
                 combinedAverages[key as keyof typeof combinedAverages];
    deviations[key] = diff;
  }

  // ここでは単純にオブジェクトを返すだけにする
  return deviations;
}

/**
 * 5. すべてまとめたラッパ関数
 */
export function detectMultiModalEmotions(
  history: ModalityScore[],
  windowSize = 10,
  weights = { face: 0.4, voice: 0.3, text: 0.3 }
) {
  if (history.length === 0) {
    return null;
  }

  // 履歴の後ろから windowSize 件を取り出して移動平均にする
  const windowData = history.slice(-windowSize);

  // 各モダリティの移動平均
  const modalityAverages = {
    face: calculateModalityAverage(windowData, "face"),
    voice: calculateModalityAverage(windowData, "voice"),
    text: calculateModalityAverage(windowData, "text"),
  };

  // 最新値
  const latest = history[history.length - 1];

  // 重み付き合算
  const combinedEmotions = combineModalityScores(latest, weights);
  const combinedAverages = combineModalityAverages(modalityAverages, weights);

  // 顕著な差分を検出
  const deviations = detectSignificantDeviations(combinedEmotions, combinedAverages);

  return {
    combinedEmotions,
    combinedAverages,
    deviations,
  };
}

/**
 * 6. 時間窓を変えて複数の分析をしたい場合 (短期/中期/長期)
 */
export function analyzeEmotionalTrend(
  history: ModalityScore[],
  timeWindows = [5, 10, 30]
) {
  return timeWindows.map((window) => ({
    windowSize: window,
    result: detectMultiModalEmotions(history, window),
  }));
}