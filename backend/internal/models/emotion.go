package models

type EmotionData struct {
	Timestamp     float64            `json:"timestamp"`
	Confidence    float64            `json:"confidence"`
	Emotions      map[string]float64 `json:"emotions"`
	Dominant      string             `json:"dominant"`        // 例: "angry", "sad", "neutral", etc.
	DominantScore float64            `json:"dominant_score"`  // Dominant感情のスコア
}