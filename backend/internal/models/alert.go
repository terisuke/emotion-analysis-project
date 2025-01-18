package models

type AlertMessage struct {
    Type    string `json:"type"`    // "alert"
    Level   string `json:"level"`
    Message string `json:"message"`
}