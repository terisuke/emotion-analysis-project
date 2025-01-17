/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/utils/emotionDetection.ts を更新
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
    const shape = blendshapes.find(b => b.categoryName.toLowerCase().includes(category.toLowerCase()));
    return acc + (shape ? shape.score : 0);
  }, 0) / categories.length;
}

function calculateEmotions(blendshapes: any[]) {
  // 表情の特徴量を取得
  const mouthSmile = getBlendshapeScore(blendshapes, ['mouthSmile']) * 1.5;
  const mouthFrown = getBlendshapeScore(blendshapes, ['mouthFrown']) * 1.2;
  const browRaise = getBlendshapeScore(blendshapes, ['browRaise', 'browInnerUp']);
  const browDown = getBlendshapeScore(blendshapes, ['browDown']) * 1.3;
  const eyeWide = getBlendshapeScore(blendshapes, ['eyeWide']);
  const jawOpen = getBlendshapeScore(blendshapes, ['jawOpen']);

  // 各感情のスコアを計算
  const emotions = {
    happy: Math.min(mouthSmile, 1),
    sad: Math.min(mouthFrown + browRaise * 0.3, 1),
    angry: Math.min(browDown + mouthFrown * 0.4, 1),
    surprised: Math.min((eyeWide + jawOpen) / 2, 1),
    neutral: 0  // 後で計算
  };

  // 他の感情の合計を計算
  const totalExpression = Object.values(emotions).reduce((sum, score) => sum + score, 0);
  
  // neutralを計算（他の感情が少ないほど高くなる）
  emotions.neutral = Math.max(0, 1 - totalExpression / 3);

  // スコアの正規化
  const total = Object.values(emotions).reduce((sum, score) => sum + score, 0);
  for (const key in emotions) {
    emotions[key as keyof typeof emotions] /= total;
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
        emotions
      };
    }
  } catch (error) {
    console.error('Error detecting emotion:', error);
  }

  return null;
}