package engine

import (
	"testing"

	"github.com/vivaldev/clickertradergame/internal/models"
)

func TestNewEngineInitialState(t *testing.T) {
	eng := NewEngine()
	state := eng.GetState()

	if state.Cash != 420.0 {
		t.Fatalf("expected initial cash 420.0, got %.2f", state.Cash)
	}
	if state.Week != 1 || state.DayOfWeek != models.DayMonday {
		t.Fatalf("expected Week 1 Monday, got Week %d %s", state.Week, state.DayOfWeek)
	}
}

func TestPerformClickAndAdvanceDay(t *testing.T) {
	eng := NewEngine()

	earned, err := eng.PerformClick(1.0)
	if err != nil {
		t.Fatalf("unexpected error on PerformClick: %v", err)
	}
	if earned <= 0 {
		t.Fatalf("expected positive earnings from click, got %.2f", earned)
	}

	stateAfterClick := eng.GetState()
	if stateAfterClick.Cash <= 420.0 {
		t.Fatalf("expected cash > 420.0 after click, got %.2f", stateAfterClick.Cash)
	}

	gameOver, msg := eng.AdvanceDay()
	if gameOver {
		t.Fatalf("did not expect game over on first day transition: %s", msg)
	}
	if eng.GetState().DayOfWeek != models.DayTuesday {
		t.Fatalf("expected Tuesday after AdvanceDay, got %s", eng.GetState().DayOfWeek)
	}
}
