package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/vivaldev/clickertradergame/internal/api"
	"github.com/vivaldev/clickertradergame/internal/engine"
)

func main() {
	eng := engine.NewEngine()
	h := api.NewHandler(eng)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintln(w, `{"status":"ok"}`)
	})
	mux.HandleFunc("GET /api/game/state", h.GetState)
	mux.HandleFunc("POST /api/game/click", h.Click)
	mux.HandleFunc("POST /api/game/advance-day", h.AdvanceDay)
	mux.HandleFunc("POST /api/game/repay-loan", h.RepayLoan)
	mux.HandleFunc("POST /api/game/minigame/complete", h.CompleteMinigame)

	addr := ":8080"
	log.Printf("Go Engine Backend listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
