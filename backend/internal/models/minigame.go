package models

// MinigameResult tallentaa minipelin lopputuloksen ja arvosanan.
type MinigameResult struct {
	MinigameType string  `json:"minigameType"`
	Precision    float64 `json:"precision"` // 0.0 - 100.0 %
	Grade        string  `json:"grade"`     // "perfect", "good", "fail"
	PayEarned    float64 `json:"payEarned"`
	XPEarned     int     `json:"xpEarned"`
	RepDelta     int     `json:"repDelta"`
}

// MinigameSubmission mallintaa frontendin lähettämän suorituksen.
type MinigameSubmission struct {
	GigID     string  `json:"gigId"`
	Precision float64 `json:"precision"`
	Seconds   float64 `json:"seconds"`
}
