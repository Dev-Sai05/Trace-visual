import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables from .env
dotenv.config();

let aiInstance: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it under Settings > Secrets in AI Studio.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Maximize payload size for large logs
  app.use(express.json({ limit: '10mb' }));

  // API endpoints FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.post("/api/analyze-log", async (req, res) => {
    try {
      const { rawLog } = req.body;
      if (!rawLog || typeof rawLog !== 'string') {
        res.status(400).json({ error: "Missing or invalid rawLog parameter." });
        return;
      }

      // Lazy initialization of GoogleGenAI to prevent crash on startup if key is missing
      let ai;
      try {
        ai = getAiClient();
      } catch (err: any) {
        res.status(500).json({
          error: "Gemini API key is not configured.",
          message: err.message,
          suggestion: "Please navigate to Settings > Secrets in the AI Studio UI to configure your GEMINI_API_KEY."
        });
        return;
      }

      const prompt = `Analyze the following COBOL/mainframe execution batch log. Map the execution flow, identify system/database/file failures, explain COBOL routines, and provide standard COBOL code recommendations to resolve issues.

Log content:
${rawLog}
`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          success: { 
            type: Type.BOOLEAN, 
            description: "Whether the execution run was completely successful (RC = 0)." 
          },
          summary: { 
            type: Type.STRING, 
            description: "A high-level conversational summary of the execution run. Explain what program was executed, what records were processed, and what was the final status." 
          },
          errorExplanation: {
            type: Type.OBJECT,
            properties: {
              rawError: { 
                type: Type.STRING, 
                description: "The exact line or error keyword in the log that indicates failure (e.g. CURSOR FETCH ERROR.000000140u or FILE STATUS = 35)." 
              },
              decodedMeaning: { 
                type: Type.STRING, 
                description: "Decoded explanation of the mainframe/COBOL error codes. E.g., SQLCODE -140 or File Status 35 meaning." 
              },
              probableCause: { 
                type: Type.STRING, 
                description: "Detailed root cause of what happened on the database, file system, or operating system." 
              },
              severity: { 
                type: Type.STRING, 
                description: "Severity of the issue (critical, warning, info)." 
              },
              reconciliationSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step-by-step actionable guide to resolve the issue."
              }
            },
            required: ["rawError", "decodedMeaning", "probableCause", "severity", "reconciliationSteps"]
          },
          moduleBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                moduleName: { type: Type.STRING, description: "The mainframe program or utility name (e.g. UT8500, GL1199, DBIODIST)." },
                role: { type: Type.STRING, description: "The functional role of this module in the system (e.g., Database log handler, central commit coordinator)." },
                description: { type: Type.STRING, description: "Description of what this module does based on standard COBOL and mainframe design." }
              },
              required: ["moduleName", "role", "description"]
            }
          },
          cobolCodeRecommendation: {
            type: Type.OBJECT,
            properties: {
              paragraph: { type: Type.STRING, description: "The COBOL paragraph name or section where the issue should be handled (e.g. E100-FETCH-GLDM)." },
              originalConcept: { type: Type.STRING, description: "The logical pseudo-code concept that failed." },
              fixedSnippet: { type: Type.STRING, description: "The corrected standard COBOL code snippet to solve the issue (use strict COBOL syntax spacing starting in Area B, properly formatted)." },
              explanation: { type: Type.STRING, description: "Detailed explanation of the COBOL code fix." }
            },
            required: ["paragraph", "originalConcept", "fixedSnippet", "explanation"]
          },
          metrics: {
            type: Type.OBJECT,
            properties: {
              totalErrors: { type: Type.INTEGER, description: "Number of errors encountered in the logs." },
              dbCommitPerformed: { type: Type.BOOLEAN, description: "True if a SQL commit (Z100-SQL-COMMIT or UTCMMT) was performed." },
              dbioOperationsCount: { type: Type.INTEGER, description: "Approximate count of DBIO operations performed." },
              totalRecordsProcessed: { type: Type.INTEGER, description: "Total records processed, count if available." }
            },
            required: ["totalErrors", "dbCommitPerformed", "dbioOperationsCount", "totalRecordsProcessed"]
          }
        },
        required: ["success", "summary", "moduleBreakdown", "metrics"]
      };

      const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-2.5-pro",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite"
      ];

      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting Gemini analysis with model: ${modelName}`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              systemInstruction: "You are an expert Mainframe System Engineer and Senior COBOL/DB2 Developer. Your job is to analyze mainframe batch run log traces, map the execution flow, identify system/database/file failures, explain COBOL routines, and provide standard COBOL code recommendations to resolve issues.",
              responseMimeType: "application/json",
              responseSchema: schema
            }
          });
          console.log(`Gemini analysis succeeded with model: ${modelName}`);
          break;
        } catch (err: any) {
          console.warn(`Model ${modelName} failed or was unavailable:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(`All Gemini models failed or were unavailable. Last error: ${lastError ? (lastError.message || lastError.toString()) : 'Unknown API Error'}`);
      }

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response content from Gemini.");
      }

      res.json(JSON.parse(responseText));
    } catch (err: any) {
      console.error("Error analyzing log with Gemini:", err);
      res.status(500).json({
        error: "Failed to analyze trace log",
        details: err.message || err.toString()
      });
    }
  });

  // Vite middleware / Static serving setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`COBOL Log Analyzer Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
