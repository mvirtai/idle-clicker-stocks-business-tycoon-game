package engine

import (
	"errors"
	"math"
	"sync"

	"github.com/vivaldev/clickertradergame/internal/models"
)

// Engine on palvelinpuolen deterministinen simulaatiomoottori.
type Engine struct {
	mu    sync.RWMutex
	state models.GameState
}

// NewEngine alustaa pelimoottorin oletustilassa.
func NewEngine() *Engine {
	return &Engine{
		state: models.GameState{
			Week:         1,
			DayOfWeek:    models.DayMonday,
			Cash:         420.0,
			LifetimeCash: 420.0,
			Player: models.PlayerState{
				Level:                 1,
				XP:                    65,
				Stamina:               85.0,
				MaxStamina:            100.0,
				PersonalRep:           35,
				BaseClickValue:        6.0,
				Certifications:        []string{"electrical_safety_1"},
				TotalClicks:           0,
				BurnoutTurnsRemaining: 0,
			},
			Loan: models.LoanState{
				Principal:            45000.0,
				InitialPrincipal:     45000.0,
				WeeklyInterestRate:   0.018, // 1.8 % viikossa
				WeeklyPayment:        450.0, // 450 € viikossa
				HomeCollateralValue:  180000.0,
				MissedPayments:       0,
				MaxMissedPayments:    3,
				TotalInterestPaid:    0.0,
				TotalPrincipalRepaid: 0.0,
				IsDefaulted:          false,
			},
			Company: models.CompanyState{
				Name:              "Virtanen & Kumppanit Oy",
				Tier:              "sole_proprietorship",
				CompanyRep:        45,
				Employees:         []models.Employee{},
				VanCapacity:       2,
				EstablishedAtWeek: 1,
			},
			Upgrades:   []models.UpgradeItem{},
			IsGameOver: false,
		},
	}
}

// GetState palauttaa kopion nykyisestä pelitilasta.
func (e *Engine) GetState() models.GameState {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.state
}

// PerformClick suorittaa manuaalisen työkilkkauksen.
func (e *Engine) PerformClick(comboMultiplier float64) (float64, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.state.IsGameOver {
		return 0, errors.New("peli on päättynyt")
	}

	staminaPenalty := 1.0
	if e.state.Player.Stamina <= 0 {
		staminaPenalty = 0.2
	}

	power := e.state.Player.BaseClickValue + float64(e.state.Player.Level)*1.5
	earned := math.Round(power*comboMultiplier*staminaPenalty*100) / 100

	staminaCost := 1.2
	e.state.Player.Stamina = math.Max(0, math.Round((e.state.Player.Stamina-staminaCost)*10)/10)
	e.state.Cash = math.Round((e.state.Cash+earned)*100) / 100
	e.state.LifetimeCash = math.Round((e.state.LifetimeCash+earned)*100) / 100
	e.state.Player.TotalClicks++

	// XP ja tasonnosto
	e.state.Player.XP += int(math.Max(1, 2*comboMultiplier))
	reqXP := e.state.Player.Level * 150
	if e.state.Player.XP >= reqXP {
		e.state.Player.Level++
		e.state.Player.XP -= reqXP
		e.state.Player.PersonalRep += 5
	}

	return earned, nil
}

// CompleteMinigame kirjaa minipelin lopputuloksen ja palkkion.
func (e *Engine) CompleteMinigame(gig models.Gig, precision float64) (models.MinigameResult, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	grade := "good"
	multiplier := 0.8
	if precision >= 90.0 {
		grade = "perfect"
		multiplier = 1.2
	} else if precision < 60.0 {
		grade = "fail"
		multiplier = 0.4
	}

	pay := math.Round(gig.PayMin+(gig.PayMax-gig.PayMin)*(precision/100.0)*multiplier)
	xpEarned := int(math.Round(float64(gig.Tier*40) * (precision / 100.0)))
	repDelta := gig.ReputationAward
	if grade == "fail" {
		repDelta = -5
	}

	e.state.Cash = math.Round((e.state.Cash+pay)*100) / 100
	e.state.LifetimeCash = math.Round((e.state.LifetimeCash+pay)*100) / 100
	e.state.Player.XP += xpEarned
	e.state.Player.PersonalRep = int(math.Max(0, math.Min(200, float64(e.state.Player.PersonalRep+repDelta))))

	return models.MinigameResult{
		MinigameType: gig.MinigameType,
		Precision:    precision,
		Grade:        grade,
		PayEarned:    pay,
		XPEarned:     xpEarned,
		RepDelta:     repDelta,
	}, nil
}

// AdvanceDay siirtää simulaatiota yhden päivän eteenpäin.
func (e *Engine) AdvanceDay() (bool, string) {
	e.mu.Lock()
	defer e.mu.Unlock()

	days := []models.DayOfWeek{
		models.DayMonday, models.DayTuesday, models.DayWednesday,
		models.DayThursday, models.DayFriday, models.DaySaturday, models.DaySunday,
	}

	currentIndex := 0
	for i, d := range days {
		if d == e.state.DayOfWeek {
			currentIndex = i
			break
		}
	}

	// Palautetaan staminasta levolla osa
	e.state.Player.Stamina = math.Min(e.state.Player.MaxStamina, e.state.Player.Stamina+20.0)

	nextIndex := (currentIndex + 1) % 7
	e.state.DayOfWeek = days[nextIndex]

	// Jos siirryttiin sunnuntaista maanantaihin, viikko vaihtuu!
	if nextIndex == 0 {
		e.state.Week++
		return e.processWeeklyAudit()
	}

	return false, "Päivä vaihdettu: " + string(e.state.DayOfWeek)
}

// processWeeklyAudit suorittaa viikkoselvityksen: velanhoito ja palkkakulut.
func (e *Engine) processWeeklyAudit() (bool, string) {
	loan := &e.state.Loan

	// 1. Työntekijöiden palkat
	totalSalaries := 0.0
	for _, emp := range e.state.Company.Employees {
		totalSalaries += emp.WeeklyCostEur
	}
	e.state.Cash -= totalSalaries

	// 2. Lainanhoito
	if loan.Principal > 0 {
		interest := math.Round(loan.Principal*loan.WeeklyInterestRate*100) / 100
		requiredPayment := loan.WeeklyPayment

		if e.state.Cash < requiredPayment {
			loan.MissedPayments++
			if loan.MissedPayments >= loan.MaxMissedPayments {
				loan.IsDefaulted = true
				e.state.IsGameOver = true
				return true, "KONKURSSI: 3 rästilyhennystä ylittyi! Pankki on realisoinut kotisi."
			}
			return false, "MAKSURÄSTI: Kassassa ei ollut varoja viikkolyhennykseen."
		}

		e.state.Cash -= requiredPayment
		principalAmortized := math.Max(0, requiredPayment-interest)
		loan.Principal = math.Max(0, math.Round((loan.Principal-principalAmortized)*100)/100)
		loan.TotalInterestPaid += interest
		loan.TotalPrincipalRepaid += principalAmortized
		loan.MissedPayments = int(math.Max(0, float64(loan.MissedPayments-1)))
	}

	return false, "Viikkoselvitys hoidettu."
}

// RepayLoanPrincipal suorittaa ylimääräisen lyhennyksen suoraan velkapääomaan.
func (e *Engine) RepayLoanPrincipal(amount float64) (float64, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.state.Loan.Principal <= 0 {
		return 0, errors.New("laina on jo maksettu kokonaan pois")
	}

	pay := math.Min(amount, e.state.Loan.Principal)
	if e.state.Cash < pay {
		return 0, errors.New("kassassa ei ole riittävästi varoja lyhennykseen")
	}

	e.state.Cash -= pay
	e.state.Loan.Principal = math.Max(0, math.Round((e.state.Loan.Principal-pay)*100)/100)
	e.state.Loan.TotalPrincipalRepaid += pay

	return pay, nil
}
