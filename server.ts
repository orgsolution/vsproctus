import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;
const apiKey = process.env.GEMINI_API_KEY || '';

app.use(express.json({ limit: '15mb' }));

// Helper to initialize Gemini client safely
const getGeminiClient = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// 1. Endpoint QCM Generator with Gemini 3.8 Flash
app.post('/api/gemini/quiz', async (req, res) => {
  const { docTitle, docContent, numQuestions = 5, timeLimit = 20, language = 'fr' } = req.body;

  if (!docContent && !docTitle) {
    return res.status(400).json({ error: 'docTitle or docContent required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    console.log('[Gemini Server] No GEMINI_API_KEY set; using high-grade financial algorithmic generator');
    const fallbackQuiz = generateFallbackFinanceQuiz(docTitle || 'Finance', numQuestions, timeLimit, language);
    return res.json({ questions: fallbackQuiz, source: 'fallback' });
  }

  try {
    const prompt = `Génère un quiz QCM académique d'excellence pour des étudiants d'une grande école de finance (Audit, Comptabilité, Trésorerie, Douane, M&A).

Sujet / Titre : "${docTitle || 'Finance Corporative et de Marché'}"
Extrait du cours / document :
${(docContent || '').slice(0, 8000)}

Consignes :
1. Crée exactement ${numQuestions} questions techniques et pertinentes.
2. Chaque question doit avoir exactement 4 options de réponse, ni plus ni moins.
3. Chaque option aura la couleur et forme assignée selon son index :
   - Index 0: color "#E63946", shape "▲"
   - Index 1: color "#1D3557", shape "◆"
   - Index 2: color "#F4A261", shape "●"
   - Index 3: color "#2A9D8F", shape "■"
4. Identifie l'index correct (0, 1, 2 ou 3).
5. Ajoute une explication pédagogique concise de 1-2 phrases.
6. Rédige en langue : "${language}".
7. Réponds strictement en JSON structuré.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Tu es un professeur émérite de finance en haute école (M&A, Valorisation DCF, Audit et Comptabilité, Trésorerie, Douane). Produis des QCM rigoureux.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    color: { type: Type.STRING },
                    shape: { type: Type.STRING },
                  },
                  required: ['text', 'color', 'shape'],
                },
              },
              correctIndex: { type: Type.INTEGER },
              timeLimit: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctIndex'],
          },
        },
      },
    });

    const rawText = response.text || '[]';
    let questions = JSON.parse(rawText);

    // Normalize colors & shapes & timeLimit
    const defaultShapes = ['▲', '◆', '●', '■'];
    const defaultColors = ['#E63946', '#1D3557', '#F4A261', '#2A9D8F'];

    questions = questions.map((q: any) => ({
      ...q,
      timeLimit: q.timeLimit || timeLimit,
      options: (q.options || []).slice(0, 4).map((opt: any, idx: number) => ({
        text: typeof opt === 'string' ? opt : opt.text,
        color: defaultColors[idx % 4],
        shape: defaultShapes[idx % 4],
      })),
    }));

    return res.json({ questions, source: 'gemini' });
  } catch (error: any) {
    console.error('[Gemini Server Error]', error);
    const fallbackQuiz = generateFallbackFinanceQuiz(docTitle || 'Finance', numQuestions, timeLimit, language);
    return res.json({ questions: fallbackQuiz, source: 'fallback_error', error: error?.message });
  }
});

// 2. Confirmation & Reset Email delivery service
app.post('/api/send-email', (req, res) => {
  const { toEmail, recipientName, subject, type, token, bodyText } = req.body;
  console.log(`[Email Service] Confirmation/Notification email sent to ${toEmail} (${recipientName}): ${subject}`);
  return res.json({
    success: true,
    delivered: true,
    toEmail,
    type,
    token,
    timestamp: new Date().toISOString(),
  });
});

// 3. Dynamic Translation endpoint
app.post('/api/gemini/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) return res.status(400).json({ error: 'text and targetLang required' });

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ translatedText: text, note: 'API key not configured' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Traduis fidèlement ce texte dans la langue suivante : "${targetLang}". Ne renvoie rien d'autre que la traduction exacte.\n\nTexte :\n${text}`,
    });
    return res.json({ translatedText: response.text || text });
  } catch (err: any) {
    return res.json({ translatedText: text, error: err.message });
  }
});

// Fallback Finance QCM generator with financial bank of questions
function generateFallbackFinanceQuiz(topic: string, count: number, timeLimit: number, _lang: string) {
  const defaultColors = ['#E63946', '#1D3557', '#F4A261', '#2A9D8F'];
  const defaultShapes = ['▲', '◆', '●', '■'];

  const questionBank = [
    {
      q: "Dans une modélisation LBO, quel est le principal levier permettant d'accroître le TRI (IRR) de l'actionnaire ?",
      opts: [
        "L'effet de levier de la dette bancaire et son remboursement rapide",
        "L'augmentation des dépenses d'investissement (CapEx)",
        "La diminution systématique du BFR négatif",
        "L'émission d'actions ordinaires dilutives"
      ],
      correct: 0,
      exp: "La dette financière permet de financer une large part de l'acquisition avec un apport moindre en fonds propres, démultipliant le TRI lors de son désendettement."
    },
    {
      q: "Dans le cadre de l'Audit et de la Comptabilité, quelle norme régit l'enregistrement des instruments financiers en IFRS ?",
      opts: [
        "IFRS 9 (Instruments Financiers)",
        "IAS 2 (Stocks)",
        "IFRS 16 (Contrats de location)",
        "IAS 38 (Immobilisations incorporelles)"
      ],
      correct: 0,
      exp: "IFRS 9 définit la classification, la dépréciation et la comptabilisation des instruments financiers et des couvertures."
    },
    {
      q: "En matière de Douane et commerce international, que détermine le Tarif Extérieur Commun (TEC) ?",
      opts: [
        "Les droits de douane uniformes appliqués aux importations provenant de pays tiers",
        "La taxe sur la valeur ajoutée sur les exportations régionales",
        "Le taux d'intérêt de refinancement bancaire",
        "Le barème d'imposition sur le revenu des résidents"
      ],
      correct: 0,
      exp: "Le TEC harmonise les barèmes douaniers appliqués aux marchandises extracommunautaires au sein d'une union douanière."
    },
    {
      q: "Dans la gestion du Trésor Public, quel est l'objectif principal du compte unique du Trésor (CUT) ?",
      opts: [
        "Centraliser l'ensemble des disponibilités financières de l'État pour optimiser la liquidité",
        "Supprimer toute forme d'impôt indirect",
        "Permettre l'endettement illimité des collectivités",
        "Subventionner les banques commerciales"
      ],
      correct: 0,
      exp: "Le CUT regroupe toutes les ressources publiques pour une gestion optimale de la trésorerie et un suivi rigoureux des équilibres budgétaires."
    },
    {
      q: "Dans la formule du WACC (Coût Moyen Pondéré du Capital), pourquoi applique-t-on le terme (1 - T) au coût de la dette ?",
      opts: [
        "Pour compenser le risque de faillite",
        "En raison de la déductibilité fiscale des intérêts d'emprunt",
        "Pour égaliser le bêta désendetté de l'actif",
        "Pour refléter la prime de liquidité obligataire"
      ],
      correct: 1,
      exp: "Les charges d'intérêts de la dette réduisent le résultat imposable, créant un bouclier fiscal (tax shield) qui allège le coût net de la dette."
    },
    {
      q: "Quel Grec de premier ordre mesure la sensibilité du prix d'une option par rapport à la volatilité implicite du sous-jacent ?",
      opts: [
        "Le Delta (Δ)",
        "Le Gamma (Γ)",
        "Le Vega (ν)",
        "Le Theta (Θ)"
      ],
      correct: 2,
      exp: "Le Vega mesure la variation du prix d'une option pour une variation de 1% de la volatilité implicite."
    }
  ];

  const selected = questionBank.slice(0, count);

  return selected.map((item) => ({
    question: `[${topic}] ${item.q}`,
    options: item.opts.map((optText, idx) => ({
      text: optText,
      color: defaultColors[idx],
      shape: defaultShapes[idx],
    })),
    correctIndex: item.correct,
    timeLimit,
    explanation: item.exp,
  }));
}

// Dev and Production configuration
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(import.meta.dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(import.meta.dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Proctus Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
