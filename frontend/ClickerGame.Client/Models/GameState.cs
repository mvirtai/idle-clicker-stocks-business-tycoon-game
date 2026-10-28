namespace ClickerGame.Client.Models;

public record GameState(
    PlayerState Player,
    CompanyState? Company = null, // null in Phase 1 (freelancer)
    LoanState? Loan = null,
    List<UpgradeItem>? Upgrades = null
);

public record LoanState(
    double Principal = 45000.0,
    double WeeklyInterestRate = 0.018,
    double WeeklyPayment = 450.0,
    bool Active = true,
    double HomeCollateralValue = 180000.0,
    int MissedPayments = 0
)
{
    public double CollateralRiskPercent => Math.Clamp((Principal / HomeCollateralValue) * 100.0, 0, 100);
}

public record UpgradeItem(
    string Id,
    string Name,
    string Category, // "tools", "certs", "equipment", "company"
    string Icon,
    string Description,
    string Lore,
    double BaseCost,
    int Level,
    int MaxLevel,
    double ClickBonus,
    double PassiveIncomeBonus,
    float StaminaDrainReduction,
    int RepBonus,
    bool Unlocked = false
)
{
    public double CurrentCost => Math.Round(BaseCost * Math.Pow(1.45, Level), 0);
    public bool IsMaxLevel => Level >= MaxLevel;
}

public record PlayerState(
    int Week,
    string DayOfWeek, // "MA", "TI", "KE", "TO", "PE", "LA", "SU"
    float Stamina,
    double Cash,
    int PersonalRep,
    int Level,
    int Xp,
    List<string> Certifications,
    List<Connection> Connections,
    double LifetimeCash = 420.0,
    int TotalClicks = 0,
    double BaseClickValue = 6.0,
    double PassiveIncomePerSec = 0.0,
    int CurrentHour = 9,
    int CurrentMinute = 0,
    bool AutoDayNightCycle = true
);

public record Connection(
    string ClientId,
    int GigsCompleted,
    float AvgPrecision,
    string LastContact,
    int Tier
);

public record CompanyState(
    string Name,
    int CompanyRep,
    List<Employee> Employees,
    int VanCapacity
);

public record Employee(
    string Id,
    string Name,
    int SkillLevel,
    double WeeklyCostEur
);

public record Gig(
    string Id,
    string ClientId,
    string ClientName,
    int Tier,
    int DurationDays,
    double PayMin,
    double PayMax,
    List<string> RequiredCerts,
    int RequiredRep,
    string ExpiresAt, // ISO date string
    string MinigameType = "timing", // "timing" | "wiring" | "troubleshooting"
    string Description = ""
);

public record WeekPlan(
    Dictionary<string, WeekSlot> Days // key: "MA", "TI" etc.
);

public record WeekSlot(
    string Type, // "empty" | "gig" | "education" | "rest" | "burnout"
    string? GigId = null,
    string? CourseName = null,
    MinigameResult? Result = null // filled after day is completed
);

public record MinigameResult(
    float Precision,
    string Grade, // "perfect" | "good" | "fail"
    int XpGained,
    int RepDelta,
    double PayEur
);
