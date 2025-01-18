/* eslint-disable @typescript-eslint/no-explicit-any */
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;

export interface EmotionScore {
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

export async function initializeFaceDetector() {
  if (!faceLandmarker) {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1
    });
  }
  return faceLandmarker;
}

function getBlendshapeScore(blendshapes: any[], categories: string[]) {
  return categories.reduce((acc, category) => {
    const shape = blendshapes.find((b: any) =>
      b.categoryName.toLowerCase().includes(category.toLowerCase())
    );
    return acc + (shape ? shape.score : 0);
  }, 0) / categories.length;
}

/**
 * この関数で表情特徴量を感情スコア5種に変換
 * neutral 計算式や clipping を変更
 */
function calculateEmotions(blendshapes: any[]) {
  // 各ブレンドシェイプの例
  const mouthSmile = getBlendshapeScore(blendshapes, ['mouthSmile']) * 1.2; // 少し控えめ
  const mouthFrown = getBlendshapeScore(blendshapes, ['mouthFrown']) * 1.1; // 少し控えめ
  const browRaise  = getBlendshapeScore(blendshapes, ['browRaise', 'browInnerUp']);
  const browDown   = getBlendshapeScore(blendshapes, ['browDown']) * 1.1;
  const eyeWide    = getBlendshapeScore(blendshapes, ['eyeWide']);
  const jawOpen    = getBlendshapeScore(blendshapes, ['jawOpen']);

  // 各感情の仮スコア
  const emotions = {
    // "Math.min(...,1)" を取り除く
    happy: (mouthSmile),
    sad: (mouthFrown + browRaise * 0.3),
    angry: (browDown + mouthFrown * 0.4),
    surprised: ((eyeWide + jawOpen) / 2),
    neutral: 0,
  };

  // 他の感情合計
  const totalExpression = Object.values(emotions).reduce((sum, v) => sum + v, 0);

  // neutralを「1 - totalExpression」で算出
  // もし totalExpression > 1 なら neutral は 0 になる
  let neutralScore = 1 - totalExpression;
  if (neutralScore < 0) {
    neutralScore = 0; // 0未満になったら0にクリップ
  }
  emotions.neutral = neutralScore;

  // ---------------------
  // 最後にすべて正規化 (合計を1にする)
  // ---------------------
  let sumAll = 0;
  for (const key of Object.keys(emotions)) {
    sumAll += emotions[key as keyof typeof emotions];
  }
  // sumAll が0なら(表情検出失敗など) 全部0のまま or ちょっと加算
  if (sumAll === 0) {
    return {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 1, // 全部0ならneutral=1にする等
    };
  }
  // 正規化
  for (const key of Object.keys(emotions)) {
    emotions[key as keyof typeof emotions] /= sumAll;
  }

  return emotions;
}

export async function detectEmotion(video: HTMLVideoElement): Promise<EmotionScore | null> {
  if (!faceLandmarker) {
    await initializeFaceDetector();
  }

  try {
    const results = faceLandmarker!.detectForVideo(video, performance.now());
    if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
      const blendshapes = results.faceBlendshapes[0].categories;
      const emotions = calculateEmotions(blendshapes);

      return {
        timestamp: performance.now(),
        confidence: results.faceBlendshapes[0].categories[0].score,
        emotions,
      };
    }
  } catch (error) {
    console.error('Error detecting emotion:', error);
  }

  return null;
}