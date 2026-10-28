package models

// DayOfWeek edustaa viikonpäivää lyhenteenä.
type DayOfWeek string

const (
	DayMonday    DayOfWeek = "MA"
	DayTuesday   DayOfWeek = "TI"
	DayWednesday DayOfWeek = "KE"
	DayThursday  DayOfWeek = "TO"
	DayFriday    DayOfWeek = "PE"
	DaySaturday  DayOfWeek = "LA"
	DaySunday    DayOfWeek = "SU"
)

// PlayerState sisältää pelaajan henkilökohtaisen etenemisen ja jaksamisen.
type PlayerState struct {
	Level                 int      `json:"level"`
	XP                    int      `json:"xp"`
	Stamina               float64  `json:"stamina"`
	MaxStamina            float64  `json:"maxStamina"`
	PersonalRep           int      `json:"personalRep"`
	BaseClickValue        float64  `json:"baseClickValue"`
	Certifications        []string `json:"certifications"`
	TotalClicks           int      `json:"totalClicks"`
	BurnoutTurnsRemaining int      `json:"burnoutTurnsRemaining"`
}

// LoanState mallintaa yrityskaupan 45 000 € pankkilainan ja perheen kodin kiinnityksen.
type LoanState struct {
	Principal            float64 `json:"principal"`            // Jäljellä oleva lainapääoma (€)
	InitialPrincipal     float64 `json:"initialPrincipal"`     // Alkuperäinen velka (45 000 €)
	WeeklyInterestRate   float64 `json:"weeklyInterestRate"`   // Viikkokorko (esim. 0.018 = 1.8%/vk)
	WeeklyPayment        float64 `json:"weeklyPayment"`        // Viikoittainen vakiolyhennys (450 €)
	HomeCollateralValue  float64 `json:"homeCollateralValue"`  // Kodin vakuusarvo (180 000 €)
	MissedPayments       int     `json:"missedPayments"`       // Rästissä olevat maksut
	MaxMissedPayments    int     `json:"maxMissedPayments"`    // Konkurssiraja (3 rästiä)
	TotalInterestPaid    float64 `json:"totalInterestPaid"`    // Maksetut korot yhteensä
	TotalPrincipalRepaid float64 `json:"totalPrincipalRepaid"` // Maksetut lyhennykset yhteensä
	IsDefaulted          bool    `json:"isDefaulted"`          // Onko koti menetetty pankille
}

// CollateralRiskPercent laskee kodin panttiriskin suhteessa jäljellä olevaan velkaan.
func (l *LoanState) CollateralRiskPercent() float64 {
	if l.HomeCollateralValue <= 0 {
		return 100.0
	}
	risk := (l.Principal / l.HomeCollateralValue) * 100.0
	if risk < 0 {
		return 0
	}
	if risk > 100 {
		return 100
	}
	return risk
}

// Employee mallintaa yritykseen palkatun ammattilaisen.
type Employee struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Role              string  `json:"role"`
	SkillLevel        int     `json:"skillLevel"`
	WeeklyCostEur     float64 `json:"weeklyCostEur"`
	DailyOutputEur    float64 `json:"dailyOutputEur"`
	StaminaEfficiency float64 `json:"staminaEfficiency"`
	HiredAtWeek       int     `json:"hiredAtWeek"`
}

// CompanyState mallintaa ostetun yrityksen tilaa (Phase 2).
type CompanyState struct {
	Name              string     `json:"name"`
	Tier              string     `json:"tier"` // sole_proprietorship, limited_company, corporation
	CompanyRep        int        `json:"companyRep"`
	Employees         []Employee `json:"employees"`
	VanCapacity       int        `json:"vanCapacity"`
	EstablishedAtWeek int        `json:"establishedAtWeek"`
}

// UpgradeItem mallintaa paja-, työkalu- tai kalustopäivityksen.
type UpgradeItem struct {
	ID                    string  `json:"id"`
	Name                  string  `json:"name"`
	Category              string  `json:"category"`
	Icon                  string  `json:"icon"`
	Description           string  `json:"description"`
	Lore                  string  `json:"lore"`
	BaseCost              float64 `json:"baseCost"`
	CostMultiplier        float64 `json:"costMultiplier"`
	Level                 int     `json:"level"`
	MaxLevel              int     `json:"maxLevel"`
	ClickBonus            float64 `json:"clickBonus"`
	PassiveIncomeBonus    float64 `json:"passiveIncomeBonus"`
	StaminaDrainReduction float64 `json:"staminaDrainReduction"`
	RepBonus              int     `json:"repBonus"`
	Unlocked              bool    `json:"unlocked"`
}

// Gig mallintaa keikkapörssin toimeksiannon.
type Gig struct {
	ID              string   `json:"id"`
	ClientID        string   `json:"clientId"`
	ClientName      string   `json:"clientName"`
	Tier            int      `json:"tier"`
	DurationDays    int      `json:"durationDays"`
	PayMin          float64  `json:"payMin"`
	PayMax          float64  `json:"payMax"`
	RequiredCerts   []string `json:"requiredCerts"`
	RequiredRep     int      `json:"requiredRep"`
	MinigameType    string   `json:"minigameType"`
	Description     string   `json:"description"`
	ExpiresAtWeek   int      `json:"expiresAtWeek"`
	ReputationAward int      `json:"reputationAward"`
}

// GameState on koko pelin juuritila.
type GameState struct {
	Week         int          `json:"week"`
	DayOfWeek    DayOfWeek    `json:"dayOfWeek"`
	Cash         float64      `json:"cash"`
	LifetimeCash float64      `json:"lifetimeCash"`
	Player       PlayerState  `json:"player"`
	Loan         LoanState    `json:"loan"`
	Company      CompanyState `json:"company"`
	Upgrades     []UpgradeItem`json:"upgrades"`
	IsGameOver   bool         `json:"isGameOver"`
}
