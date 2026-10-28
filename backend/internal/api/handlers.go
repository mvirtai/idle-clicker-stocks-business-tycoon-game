package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/vivaldev/clickertradergame/internal/engine"
	"github.com/vivaldev/clickertradergame/internal/models"
)

// Handler hoitaa HTTP-rajapintapyynnöt.
type Handler struct {
	Engine *engine.Engine
}

func NewHandler(eng *engine.Engine) *Handler {
	return &Handler{Engine: eng}
}

// writeJSON encodes v as JSON and reports encoding failures.
func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("failed to encode response: %v", err)
	}
}

func (h *Handler) GetState(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, h.Engine.GetState())
}

func (h *Handler) Click(w http.ResponseWriter, r *http.Request) {
	earned, err := h.Engine.PerformClick(1.0)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, map[string]interface{}{
		"success": true,
		"earned":  earned,
		"state":   h.Engine.GetState(),
	})
}

func (h *Handler) AdvanceDay(w http.ResponseWriter, r *http.Request) {
	gameOver, msg := h.Engine.AdvanceDay()

	writeJSON(w, map[string]interface{}{
		"success":  true,
		"gameOver": gameOver,
		"message":  msg,
		"state":    h.Engine.GetState(),
	})
}

func (h *Handler) RepayLoan(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Virheellinen JSON", http.StatusBadRequest)
		return
	}

	paid, err := h.Engine.RepayLoanPrincipal(body.Amount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, map[string]interface{}{
		"success": true,
		"paid":    paid,
		"state":   h.Engine.GetState(),
	})
}

func (h *Handler) CompleteMinigame(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Gig       models.Gig `json:"gig"`
		Precision float64    `json:"precision"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Virheellinen pyyntö", http.StatusBadRequest)
		return
	}

	result, err := h.Engine.CompleteMinigame(body.Gig, body.Precision)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	writeJSON(w, map[string]interface{}{
		"success": true,
		"result":  result,
		"state":   h.Engine.GetState(),
	})
}
