package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"emotion-analysis/api/handlers"
	"emotion-analysis/internal/services"
)

func main() {
	r := gin.Default()

	// CORS設定
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization"}
	r.Use(cors.New(config))

	// WebSocket Hub は handlers.init() で初期化済み
	// Aggregator初期化 (wsHubを渡す)
	services.InitAggregator(handlers.GetHub())

	// ルート設定
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Emotion Analysis API",
		})
	})

	// WebSocket接続用のルート
	r.GET("/ws", handlers.HandleWebSocket)

	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}