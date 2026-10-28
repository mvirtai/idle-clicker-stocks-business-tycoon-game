import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministinen palvelinpuolen pelitila (Go-moottorin peilaus Node/TS-ympäristössä)
interface ServerGameState {
  week: number;
  dayOfWeek: string;
  cash: number;
  lifetimeCash: number;
  stamina: number;
  maxStamina: number;
  personalRep: number;
  loan: {
    principal: number;
    initialPrincipal: number;
    weeklyInterestRate: number;
    weeklyPayment: number;
    homeCollateralValue: number;
    missedPayments: number;
    maxMissedPayments: number;
    isDefaulted: boolean;
  };
}

let gameState: ServerGameState = {
  week: 1,
  dayOfWeek: 'MA',
  cash: 420.0,
  lifetimeCash: 420.0,
  stamina: 85.0,
  maxStamina: 100.0,
  personalRep: 35,
  loan: {
    principal: 45000.0,
    initialPrincipal: 45000.0,
    weeklyInterestRate: 0.018,
    weeklyPayment: 450.0,
    homeCollateralValue: 180000.0,
    missedPayments: 0,
    maxMissedPayments: 3,
    isDefaulted: false,
  },
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Terveystarkistus
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      engine: 'From Gigs to Giants Hybrid Engine',
      port: PORT,
      timestamp: Date.now(),
    });
  });

  // Hakee palvelinauktoritatiivisen pelitilan
  app.get('/api/game/state', (req: Request, res: Response) => {
    res.json(gameState);
  });

  // Työklikkauksen käsittely
  app.post('/api/game/click', (req: Request, res: Response) => {
    const { comboMultiplier = 1.0 } = req.body;
    const earned = Math.round(6.0 * comboMultiplier * 100) / 100;
    gameState.cash = Math.round((gameState.cash + earned) * 100) / 100;
    gameState.lifetimeCash = Math.round((gameState.lifetimeCash + earned) * 100) / 100;
    gameState.stamina = Math.max(0, Math.round((gameState.stamina - 1.2) * 10) / 10);

    res.json({ success: true, earned, state: gameState });
  });

  // Päivän ja viikon edistäminen
  app.post('/api/game/advance-day', (req: Request, res: Response) => {
    const days = ['MA', 'TI', 'KE', 'TO', 'PE', 'LA', 'SU'];
    const curIdx = days.indexOf(gameState.dayOfWeek);
    const nextIdx = (curIdx + 1) % 7;
    gameState.dayOfWeek = days[nextIdx];
    gameState.stamina = Math.min(gameState.maxStamina, gameState.stamina + 20);

    let weeklyReport = null;
    let gameOver = false;

    // Viikon vaihtuessa suoritetaan korko- ja velkalaskenta
    if (nextIdx === 0) {
      gameState.week++;
      if (gameState.loan.principal > 0) {
        const interest = Math.round(gameState.loan.principal * gameState.loan.weeklyInterestRate * 100) / 100;
        const payment = gameState.loan.weeklyPayment;

        if (gameState.cash < payment) {
          gameState.loan.missedPayments++;
          if (gameState.loan.missedPayments >= gameState.loan.maxMissedPayments) {
            gameState.loan.isDefaulted = true;
            gameOver = true;
          }
        } else {
          gameState.cash = Math.round((gameState.cash - payment) * 100) / 100;
          const principalAmortized = Math.max(0, payment - interest);
          gameState.loan.principal = Math.max(0, Math.round((gameState.loan.principal - principalAmortized) * 100) / 100);
        }
      }
    }

    res.json({
      success: true,
      gameOver,
      state: gameState,
      message: `Päivä edistetty: ${gameState.dayOfWeek}`,
    });
  });

  // Lainan lyhennys
  app.post('/api/game/repay-loan', (req: Request, res: Response) => {
    const { amount } = req.body;
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Virheellinen summa' });
    }

    const pay = Math.min(amount, gameState.loan.principal);
    if (gameState.cash < pay) {
      return res.status(400).json({ error: 'Kassassa ei ole riittävästi varoja' });
    }

    gameState.cash = Math.round((gameState.cash - pay) * 100) / 100;
    gameState.loan.principal = Math.max(0, Math.round((gameState.loan.principal - pay) * 100) / 100);

    res.json({ success: true, paid: pay, state: gameState });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite is a devDependency; load it lazily so production images do not need it
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`From Gigs to Giants server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
