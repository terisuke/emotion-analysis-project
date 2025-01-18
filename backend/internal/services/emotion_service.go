package services

import (
	"emotion-analysis/internal/models"
	"encoding/json"
)

type EmotionService struct{}

func NewEmotionService() *EmotionService {
	return &EmotionService{}
}

func (s *EmotionService) ProcessEmotionData(data []byte) (*models.EmotionData, error) {
	var emotionData models.EmotionData
	if err := json.Unmarshal(data, &emotionData); err != nil {
		return nil, err
	}

	return &emotionData, nil
}
