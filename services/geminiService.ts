import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, Opportunity, MarketScanResult, SpyReport } from "../types";

// Initialize Gemini Client
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the Schema for the Output
const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["Freelance", "Micro-SaaS", "DigitalProduct"] },
    description: { type: Type.STRING },
    matchScore: { type: Type.INTEGER, description: "Percentage match 0-100 based on user profile" },
    matchReasoning: { type: Type.STRING, description: "Explain the transfer of skills (e.g. 'Since you know X, you can easily build Y')" },
    estimatedValue: { type: Type.STRING, description: "E.g. $50/hr or $500/mo" },
    platform: { type: Type.STRING },
    actionPlan: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step by step execution plan"
    },
    techStackRecommendation: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Recommended tech stack subset"
    },
    learningBridge: {
      type: Type.OBJECT,
      nullable: true,
      description: "Only populated if matchScore is between 60-80 and a high value skill is missing.",
      properties: {
        missingSkill: { type: Type.STRING },
        analogy: { type: Type.STRING, description: "Explain it simply using concepts they know" },
        hoursToLearn: { type: Type.INTEGER },
        curriculum: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-4 step crash course" }
      },
      required: ["missingSkill", "analogy", "hoursToLearn", "curriculum"]
    }
  },
  required: ["title", "type", "description", "matchScore", "matchReasoning", "actionPlan", "techStackRecommendation"]
};

const spyReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
    marketStatus: { type: Type.STRING, description: "Summary of market saturation" },
    competitorWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Complaints found in reviews/reddit" },
    winningAngle: { type: Type.STRING, description: "Specific strategy to beat competitors (e.g. lower price, better UX)" },
    valuation: {
      type: Type.OBJECT,
      description: "ROI Calculation",
      properties: {
        estimatedEffortHours: { type: Type.INTEGER, description: "Hours to build MVP based on user techstack" },
        projectedRevenue: { type: Type.STRING, description: "Conservative estimate" },
        dollarPerHour: { type: Type.NUMBER, description: "Projected Value / Effort Hours" },
        rationale: { type: Type.STRING, description: "Brief explanation of the math" }
      },
      required: ["estimatedEffortHours", "projectedRevenue", "dollarPerHour", "rationale"]
    }
  },
  required: ["competitors", "marketStatus", "competitorWeaknesses", "winningAngle", "valuation"]
};

// New function to parse unstructured text into a UserProfile
export const parseUserProfile = async (text: string): Promise<Partial<UserProfile>> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `
    You are an intelligent profile parser. Extract user details from the text below to populate a "Digital Twin" profile.
    
    TEXT INPUT:
    "${text}"
    
    INSTRUCTIONS:
    1. Extract specific details (Name, Skills, Stack).
    2. GENERALIZE THE SKILLS: If the user says "I built a Face Rec system", add "Computer Vision" and "Pattern Recognition" to Core Skills. If they say "I built an E-commerce site", add "Complex State Management" and "Database Architecture".
    3. For "platformTarget": Extract specific platforms if mentioned. IF NOT mentioned, return an empty string "".
    
    Your goal is to capture the *capabilities* of the user, not just the keywords.
  `;

  const profileSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      coreSkills: { type: Type.STRING, description: "Specific skills AND generalized capabilities" },
      techStack: { type: Type.STRING },
      resources: { type: Type.STRING },
      interests: { type: Type.STRING },
      platformTarget: { type: Type.STRING },
    }
  };

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: profileSchema
    }
  });

  return JSON.parse(response.text) as Partial<UserProfile>;
};

// CONTINUOUS DISCOVERY AGENT
export const discoverNextOpportunity = async (
  profile: UserProfile, 
  existingTitles: string[], 
  onLog?: (msg: string) => void
): Promise<{ opportunity: Opportunity, source: { title: string, uri: string } | null }> => {
  
  const modelIdSearch = "gemini-2.5-flash";
  const modelIdReasoning = "gemini-2.5-flash";
  
  // Phase 1: Brainstorming & Searching (The Radar)
  onLog?.("Abstracting skills to find lateral opportunities...");

  const targetPlatforms = profile.platformTarget && profile.platformTarget.trim() !== "" 
    ? profile.platformTarget 
    : "Upwork, Freelancer, Gumroad, Micro-SaaS markets";

  const historyContext = existingTitles.length > 0 
    ? `I have already found these opportunities (DO NOT REPEAT SIMILAR IDEAS): ${existingTitles.join(", ")}.`
    : "This is the first search.";

  const searchPrompt = `
    You are a Lateral Thinking Talent Manager. Your goal is to find a high-value opportunity by GENERALIZING the user's skills.
    
    USER PROFILE:
    Skills: ${profile.coreSkills}
    Tech: ${profile.techStack}
    Interests: ${profile.interests}
    
    HISTORY: ${historyContext}

    PROTOCOL - SKILL ABSTRACTION:
    1.  **Generalize**: If user knows "Facial Recognition", they also know "Computer Vision" -> Look for Vehicle/Object detection jobs.
    2.  **Transplant**: If user knows "E-commerce (React/Node)", they know "CRUD & Auth" -> Look for LMS, Real Estate Dashboards, or Inventory Systems.
    3.  **Cross-Pollinate**: Combine their Tech Stack with a random trending industry (AgriTech, LegalTech, EdTech).

    TASK:
    1. Formulate ONE specific, fresh hypothesis based on this Lateral Thinking.
    2. Search Google to validate if there is ACTUAL demand for this specific thing right now.
    3. Look for "Stretch Opportunities" where they might need to learn one small new thing.
    
    Focus on: ${targetPlatforms}
  `;

  onLog?.("Investigating market demand for lateral concept...");

  const searchResponse = await ai.models.generateContent({
    model: modelIdSearch,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const marketData = searchResponse.text;
  const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  // Get the best source for this specific idea
  const source = groundingChunks.find((c: any) => c.web)?.web || null;

  // Phase 2: Synthesis (The Matchmaker)
  onLog?.("Synthesizing opportunity & calculating fit...");

  const synthesisPrompt = `
    You are the Matchmaker.
    
    USER PROFILE: ${JSON.stringify(profile)}
    MARKET DATA FOUND: ${marketData}
    
    Create ONE structured Opportunity based on the research above.
    
    CRITICAL RULES:
    1. **Explain the Pivot**: In 'matchReasoning', explicitly state: "Because you built X, you can build Y".
    2. If the market data shows NO demand, invent a 'Pivot' strategy based on the data.
    3. Calculate Match Score carefully.
    4. If Match Score is 60-80%, generate a 'Learning Bridge'.
  `;

  const synthesisResponse = await ai.models.generateContent({
    model: modelIdReasoning,
    contents: synthesisPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: opportunitySchema
    }
  });

  const parsedOp = JSON.parse(synthesisResponse.text);
  const opportunity: Opportunity = {
    ...parsedOp,
    id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };

  onLog?.(`Found: ${opportunity.title}`);

  return { 
    opportunity, 
    source: source ? { title: source.title, uri: source.uri } : null 
  };
};

export const analyzeCompetitors = async (opportunity: Opportunity, onLog?: (msg: string) => void): Promise<SpyReport> => {
  const modelId = "gemini-2.5-flash";

  onLog?.(`Initializing Niche Spy for "${opportunity.title.substring(0, 30)}"...`);
  
  const searchPrompt = `
    I have a product/service idea: "${opportunity.title}" (${opportunity.description}).
    Target platform: ${opportunity.platform}.
    
    Perform a competitive analysis and pricing research:
    1. Search for existing competitors or alternatives on Google, Reddit, and ProductHunt.
    2. Search for PRICING of similar services (monthly subs, hourly rates, fixed project costs).
    3. Search for complaints to find weaknesses.
  `;

  onLog?.("Spy Agent searching Google, Reddit & ProductHunt...");

  // Step 1: Search for competitor info
  const searchResponse = await ai.models.generateContent({
    model: modelId,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  onLog?.("Intel gathered. Analyzing competitor weaknesses...");

  const researchData = searchResponse.text;

  // Step 2: Synthesize Spy Report + Valuation
  const analysisPrompt = `
    You are "The Niche Spy" and "Valuation Expert".
    
    IDEA: ${opportunity.title}
    TECH STACK RECOMMENDED: ${opportunity.techStackRecommendation.join(", ")}
    MARKET RESEARCH: ${researchData}

    Analyze the market to find a "Winning Angle" AND Calculate ROI.
    
    VALUATION LOGIC:
    - Estimate Effort: How many hours would it take a skilled dev (using the recommended stack) to build/complete this? Be realistic.
    - Estimate Revenue: Based on competitor pricing found in research.
    - Calculate $/Hour: Revenue / Effort.
  `;

  onLog?.("Valuation Engine calculating ROI & Effort...");

  const analysisResponse = await ai.models.generateContent({
    model: modelId,
    contents: analysisPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: spyReportSchema
    }
  });

  onLog?.("Final Report compiled.");

  return JSON.parse(analysisResponse.text) as SpyReport;
};