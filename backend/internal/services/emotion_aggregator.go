// ※ユーザーIDの概念が無い場合はグローバルでもいいが、あれば userID -> []EmotionData で管理

package services

import (
    "log"
    "sync"
    "time"

    "emotion-analysis/internal/models"
    "emotion-analysis/pkg/websocket"
    "encoding/json"
)

// 1. Aggregator構造体: 全体の直近の感情データを保持
type EmotionAggregator struct {
    // グローバルに全データを保持
    data  []*models.EmotionData
    mu    sync.Mutex

    // WebSocketハブへの参照 (アラート送信用)
    Hub   *websocket.Hub

    // 監視間隔などの設定
    checkInterval time.Duration
    keepDuration  time.Duration
}

// グローバルなAggregatorインスタンス
var GlobalAggregator *EmotionAggregator

// 初期化
func InitAggregator(hub *websocket.Hub) {
    GlobalAggregator = &EmotionAggregator{
        data:  make([]*models.EmotionData, 0),
        Hub:   hub,
        checkInterval: 1 * time.Second,  // 1秒ごとチェック
        keepDuration:  5 * time.Second,  // 例: 5秒間の履歴を保持
    }
    // goroutineで定期的にチェックを回す
    go GlobalAggregator.runChecker()
}

// AddEmotion: 感情データを追加
func (agg *EmotionAggregator) AddEmotion(_ string, e *models.EmotionData) {
    agg.mu.Lock()
    defer agg.mu.Unlock()

    // 直近keepDuration(例:5秒)以外のデータは捨てる
    now := e.Timestamp
    cutoff := now - agg.keepDuration.Seconds()*1000 // 例: Timestampがmillisecondsなら計算合わせる
    // ↑ emotionData.Timestamp が "performance.now()" ならms単位なので

    // 既存のsliceから古いデータを除去
    var newSlice []*models.EmotionData
    for _, d := range agg.data {
        if d.Timestamp >= cutoff {
            newSlice = append(newSlice, d)
        }
    }
    // 末尾に新データを追加
    newSlice = append(newSlice, e)
    agg.data = newSlice
}

// runChecker: 1秒ごとに直近5秒分を見て「怒り or 悲しみが継続」してないか判定
func (agg *EmotionAggregator) runChecker() {
    ticker := time.NewTicker(agg.checkInterval)
    defer ticker.Stop()

    for {
        <-ticker.C
        agg.mu.Lock()
        slice := agg.data
        // slice内の "angry" or "sad" が閾値超え続けてるかを判定
        // 例えば "angry>0.8 のフレームが全フレームの80%以上 かつ slice全体の期間>=3秒" など
        if len(slice) == 0 {
            agg.mu.Unlock()
            continue
        }
        durationMs := slice[len(slice)-1].Timestamp - slice[0].Timestamp // ms

        // 怒り連続判定: 例: 全体の平均angryが 0.8 以上 かつ 3秒以上
        if durationMs >= 3000 {
            avgAngry, avgSad := calcAverageAngrySad(slice)
            if avgAngry >= 0.8 {
                // アラート送信
                agg.sendAlert("怒りが3秒以上高い状態です！", "warning")
            } else if avgSad >= 0.7 {
                agg.sendAlert("悲しみが継続して高い状態です...", "info")
            }
        }
        agg.mu.Unlock()
    }
}

// calcAverageAngrySad: slice内のangry/sad平均値
func calcAverageAngrySad(data []*models.EmotionData) (angryAvg float64, sadAvg float64) {
    var sumAngry, sumSad float64
    for _, d := range data {
        sumAngry += d.Emotions["angry"]
        sumSad   += d.Emotions["sad"]
    }
    n := float64(len(data))
    return sumAngry / n, sumSad / n
}

// sendAlert: WebSocketハブに "type=alert" メッセージを送る
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
    // 全員へブロードキャスト
    agg.Hub.Broadcast <- b
}