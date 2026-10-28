package engine

import (
	"sync"
	"testing"

	"github.com/vivaldev/clickertradergame/internal/models"
)

func TestNewEngineInitialState(t *testing.T) {
	eng := NewEngine()
	state := eng.GetState()

	if state.Week != 1 {
		t.Fatalf("expected initial week 1, got %d", state.Week)
	}
	if state.DayOfWeek != models.DayMonday {
		t.Fatalf("expected initial day MA, got %s", state.DayOfWeek)
	}
	if state.Cash != 420.0 {
		t.Fatalf("expected initial cash 420.0, got %.2f", state.Cash)
	}
	if state.Loan.Principal != 45000.0 {
		t.Fatalf("expected initial loan principal 45000.0, got %.2f", state.Loan.Principal)
	}
}

func TestPerformClickAndStaminaDrain(t *testing.T) {
	eng := NewEngine()
	before := eng.GetState()

	earned, err := eng.PerformClick(1.0)
	if err != nil {
		t.Fatalf("unexpected error on PerformClick: %v", err)
	}
	if earned <= 0 {
		t.Fatalf("expected positive earnings from click, got %.2f", earned)
	}

	after := eng.GetState()
	if after.Cash != before.Cash+earned {
		t.Fatalf("expected cash %.2f, got %.2f", before.Cash+earned, after.Cash)
	}
	if after.Player.Stamina >= before.Player.Stamina {
		t.Fatalf("expected stamina to decrease after click: before %.1f, after %.1f", before.Player.Stamina, after.Player.Stamina)
	}
}

func TestAdvanceDayAndWeeklyAudit(t *testing.T) {
	eng := NewEngine()

	// Advance 6 days (MA -> SU)
	for i := 0; i < 6; i++ {
		bankrupt, _ := eng.AdvanceDay()
		if bankrupt {
			t.Fatalf("unexpected bankruptcy on day transition %d", i)
		}
	}

	stateOnSunday := eng.GetState()
	if stateOnSunday.DayOfWeek != models.DaySunday {
		t.Fatalf("expected Sunday after 6 transitions, got %s", stateOnSunday.DayOfWeek)
	}

	// Advancing from Sunday -> Monday triggers week 2 and weekly debt audit
	bankrupt, _ := eng.AdvanceDay()
	if bankrupt {
		t.Fatalf("should not go bankrupt on first missed payment")
	}

	stateWeek2 := eng.GetState()
	if stateWeek2.Week != 2 {
		t.Fatalf("expected week 2 after Sunday transition, got %d", stateWeek2.Week)
	}
	if stateWeek2.DayOfWeek != models.DayMonday {
		t.Fatalf("expected Monday at start of week 2, got %s", stateWeek2.DayOfWeek)
	}
}

func TestConcurrentClicksRaceSafety(t *testing.T) {
	eng := NewEngine()
	var wg sync.WaitGroup

	for i := 0; i < 25; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _ = eng.PerformClick(1.0)
		}()
	}

	wg.Wait()
	state := eng.GetState()
	if state.Player.TotalClicks != 25 {
		t.Fatalf("expected 25 concurrent clicks recorded, got %d", state.Player.TotalClicks)
	}
}
