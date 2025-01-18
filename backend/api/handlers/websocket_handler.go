package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	gorillaws "github.com/gorilla/websocket"
	"emotion-analysis/pkg/websocket"
	"emotion-analysis/internal/services"
)

var upgrader = gorillaws.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 開発時に全オリジン許可。本番では適切に設定
	},
}

// WebSocketハブのインスタンスをパッケージレベルで保持
var wsHub *websocket.Hub

func init() {
	// 新しいHubを作成して走らせる
	wsHub = websocket.NewHub()
	go wsHub.Run()
	log.Printf("WebSocket Hub initialized and running")
}

// GetHub は他パッケージから wsHub を取得するためのGetter関数
func GetHub() *websocket.Hub {
	return wsHub
}

func HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to websocket: %v", err)
		return
	}

	client := &websocket.Client{
		Conn: conn,
	}

	log.Printf("New client connected")
	wsHub.Register <- client

	for {
		// WebSocketでメッセージ受信
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Client disconnected with error: %v", err)
			wsHub.Unregister <- client
			break
		}

		log.Printf("Received message from client")

		// JSON -> EmotionData へ変換
		emotionData, err := services.NewEmotionService().ProcessEmotionData(message)
		if err != nil {
			log.Printf("Error processing emotion data: %v", err)
			continue
		}

		// 1) 感情データを全クライアントへブロードキャスト (グラフ用)
		processedData, err := json.Marshal(emotionData)
		if err != nil {
			log.Printf("Error marshaling emotion data: %v", err)
			continue
		}
		wsHub.Broadcast <- processedData

		// 2) Aggregatorに追加し、継続判定に備える
		//  ユーザーIDを "anonymous" など固定にしていますが、
		//  実際には c.Query("user") とかトークンなどで識別する想定。
		services.GlobalAggregator.AddEmotion("anonymous", emotionData)
	}
}