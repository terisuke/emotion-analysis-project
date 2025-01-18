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
		return true // 開発環境用。本番環境では適切なオリジン確認が必要
	},
}

// WebSocketハブのインスタンスをパッケージレベルで保持
var wsHub *websocket.Hub
var emotionService *services.EmotionService

func init() {
	wsHub = websocket.NewHub()
	emotionService = services.NewEmotionService()
	go wsHub.Run()
	log.Printf("WebSocket Hub initialized and running") // 初期化ログ
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

	log.Printf("New client connected") // 接続ログ
	wsHub.Register <- client

	// クライアントからのメッセージを処理
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Client disconnected with error: %v", err) // 切断ログ
			wsHub.Unregister <- client
			break
		}

		log.Printf("Received message from client") // 受信ログ

		// 受信したデータを処理
		emotionData, err := emotionService.ProcessEmotionData(message)
		if err != nil {
			log.Printf("Error processing emotion data: %v", err)
			continue
		}

		log.Printf("Processed emotion data: %+v", emotionData) // 処理済みデータのログ

		// 処理したデータをJSON形式に変換
		processedData, err := json.Marshal(emotionData)
		if err != nil {
			log.Printf("Error marshaling emotion data: %v", err)
			continue
		}

		log.Printf("Broadcasting emotion data to all clients") // ブロードキャストログ
		// 処理したデータをブロードキャスト
		wsHub.Broadcast <- processedData
	}
}