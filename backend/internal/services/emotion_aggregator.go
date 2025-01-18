package services

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"emotion-analysis/internal/models"
	"emotion-analysis/pkg/websocket"
)

// EmotionAggregator: 直近のEmotionDataを保持し定期的にチェック
type EmotionAggregator struct {
	data []*models.EmotionData
	mu   sync.Mutex

	Hub *websocket.Hub

	checkInterval time.Duration
	keepDuration  time.Duration
}

var GlobalAggregator *EmotionAggregator

func InitAggregator(hub *websocket.Hub) {
	GlobalAggregator = &EmotionAggregator{
		data:          make([]*models.EmotionData, 0),
		Hub:           hub,
		checkInterval: 1 * time.Second,  // 1秒ごとチェック
		keepDuration:  10 * time.Second, // ★ 10秒分の履歴を保持
	}
	go GlobalAggregator.runChecker()
}

// AddEmotion: EmotionDataを追加
func (agg *EmotionAggregator) AddEmotion(_ string, e *models.EmotionData) {
	agg.mu.Lock()
	defer agg.mu.Unlock()

	// 1) Dominant emotionを計算してセット (既にフロントが付与していても再計算OK)
	dominant, score := GetDominantEmotion(e.Emotions)
	e.Dominant = dominant
	e.DominantScore = score

	// 2) 10秒を越えた古いデータを削除
	now := e.Timestamp
	cutoff := now - agg.keepDuration.Seconds()*1000 // msベース
	var newSlice []*models.EmotionData
	for _, d := range agg.data {
		if d.Timestamp >= cutoff {
			newSlice = append(newSlice, d)
		}
	}
	newSlice = append(newSlice, e)
	agg.data = newSlice
}

func (agg *EmotionAggregator) runChecker() {
	ticker := time.NewTicker(agg.checkInterval)
	defer ticker.Stop()

	for {
		<-ticker.C

		agg.mu.Lock()
		slice := agg.data
		if len(slice) == 0 {
			agg.mu.Unlock()
			continue
		}

		// 直近データの経過時間 (ms)
		durationMs := slice[len(slice)-1].Timestamp - slice[0].Timestamp

		// 各dominant感情のフレーム数を数える
		var angryCount, sadCount, neutralCount int
		for _, d := range slice {
			// (例) ある程度scoreが高いときのみカウント
			if d.DominantScore >= 0.4 {
				switch d.Dominant {
				case "angry":
					angryCount++
				case "sad":
					sadCount++
				case "neutral":
					neutralCount++
				}
			}
		}

		totalFrames := len(slice)
		angryRatio := float64(angryCount) / float64(totalFrames)
		sadRatio := float64(sadCount) / float64(totalFrames)
		neutralRatio := float64(neutralCount) / float64(totalFrames)

		// ここで判定: 5秒以上かつ各感情比率がしきい値を超えたらアラート
		if durationMs >= 5000 { // 5秒以上
			// 例: 怒り80%以上
			if angryRatio >= 0.8 {
				agg.sendAlert("怒りが5秒以上継続しています...", "warning")
			} else if sadRatio >= 0.7 {
				agg.sendAlert("悲しみが5秒以上継続しています...", "info")
			} else if neutralRatio >= 0.9 {
				// ★ 追加例: 無表情90%超
				agg.sendAlert("もっと熱くなれよ！", "info")
			}
		}

		agg.mu.Unlock()
	}
}

func (agg *EmotionAggregator) sendAlert(msg, level string) {
	alert := models.AlertMessage{
		Type:    "alert",
		Level:   level,
		Message: msg,
	}
	b, err := json.Marshal(alert)
	if err != nil {
		log.Printf("sendAlert marshal error: %v", err)
		return
	}
	// 全クライアントへBroadcast
	agg.Hub.Broadcast <- b
}