package handlers

import (
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

	wsHub.Register <- client

	// クライアントからのメッセージを処理
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("error: %v", err)
			wsHub.Unregister <- client
			break
		}

		// 受信したデータを処理
		emotionData, err := emotionService.ProcessEmotionData(message)
		if err != nil {
			log.Printf("Error processing emotion data: %v", err)
			continue
		}

		// 処理したデータをブロードキャスト
		wsHub.Broadcast <- message
	}
}