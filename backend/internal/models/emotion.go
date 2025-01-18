package models

type EmotionData struct {
	Timestamp  float64               `json:"timestamp"`
	Confidence float64            `json:"confidence"`
	Emotions   map[string]float64 `json:"emotions"`
}