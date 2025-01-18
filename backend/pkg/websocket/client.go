package websocket

import (
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn *websocket.Conn
	Mu   sync.Mutex
}

type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	Mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Mu.Lock()
			h.Clients[client] = true
			h.Mu.Unlock()
		case client := <-h.Unregister:
			h.Mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				client.Conn.Close()
			}
			h.Mu.Unlock()
		case message := <-h.Broadcast:
			h.Mu.RLock()
			for client := range h.Clients {
				client.Mu.Lock()
				err := client.Conn.WriteMessage(websocket.TextMessage, message)
				client.Mu.Unlock()
				if err != nil {
					log.Printf("error: %v", err)
					client.Conn.Close()
					delete(h.Clients, client)
				}
			}
			h.Mu.RUnlock()
		}
	}
}