package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 開発環境用。本番環境では適切なオリジン確認が必要
	},
}

// WebSocketハブのインスタンスをパッケージレベルで保持
var wsHub *websocket.Hub

func init() {
	wsHub = websocket.NewHub()
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

	wsHub.register <- client

	// クライアントからのメッセージを処理
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("error: %v", err)
			wsHub.unregister <- client
			break
		}
		wsHub.broadcast <- message
	}
}