package services

import (
	"emotion-analysis/internal/models"
	"encoding/json"
)

type EmotionService struct{}

func NewEmotionService() *EmotionService {
	return &EmotionService{}
}

// JSON -> EmotionDataへ変換
func (s *EmotionService) ProcessEmotionData(data []byte) (*models.EmotionData, error) {
	var emotionData models.EmotionData
	if err := json.Unmarshal(data, &emotionData); err != nil {
		return nil, err
	}
	return &emotionData, nil
}

// dominant emotion を返す
func GetDominantEmotion(emotions map[string]float64) (string, float64) {
	var bestLabel string
	var bestVal float64
	for label, val := range emotions {
		if val > bestVal {
			bestVal = val
			bestLabel = label
		}
	}
	return bestLabel, bestVal
}