import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile, Opportunity, MarketScanResult, SpyReport } from "../types";

let ai: GoogleGenAI | null = null;

// Helper to reset the client (not strictly needed with env var but kept for API compat)
export const resetAiClient = () => {
  ai = null;
};

// Initialization of the Gemini Client
const getAiClient = (): GoogleGenAI => {
  if (ai) return ai;

  // PRIORITY: Check Local Storage first (User Input), then fall back to Env Var
  const apiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key is missing. Please enter it in the settings.");
  }

  ai = new GoogleGenAI({ apiKey });
  return ai;
};

// Define the Schema for the Output
const opportunitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["Freelance", "Micro-SaaS", "DigitalProduct", "Automation/MMO"] },
    description: { type: Type.STRING },
    matchScore: { type: Type.INTEGER, description: "Percentage match 0-100 based on user profile" },
    matchReasoning: { type: Type.STRING, description: "Explain the transfer of skills (e.g. 'Since you know X, you can easily build Y')" },
    estimatedValue: { type: Type.STRING, description: "E.g. $50/hr or $500/mo" },
    platform: { type: Type.STRING },
    actionPlan: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step by step execution plan. Focus on 'Selling the outcome' first, then 'Building the bot'. Include specific outreach strategies."
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
    2. Extract PROFESSIONAL BACKGROUND: Look for education level (Student, PhD), job titles (Intern, Senior), and years of experience.
    3. GENERALIZE THE SKILLS: If the user says "I built a Face Rec system", add "Computer Vision" and "Pattern Recognition" to Core Skills.
    4. For "platformTarget": Extract specific platforms if mentioned. IF NOT mentioned, return an empty string "".
    
    Your goal is to capture the *capabilities* and *experience level* of the user.
  `;

  const profileSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      background: { type: Type.STRING, description: "Education, Experience Level, or Current Role" },
      coreSkills: { type: Type.STRING, description: "Specific skills AND generalized capabilities" },
      techStack: { type: Type.STRING },
      resources: { type: Type.STRING },
      interests: { type: Type.STRING },
      platformTarget: { type: Type.STRING },
    }
  };

  const client = getAiClient();
  const response = await client.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: profileSchema
    }
  });

  return JSON.parse(response.text) as Partial<UserProfile>;
};

// CONTINUOUS DISCOVERY AGENT - DOMAIN ARBITRAGE EDITION
export const discoverNextOpportunity = async (
  profile: UserProfile, 
  existingTitles: string[], 
  onLog?: (msg: string) => void
): Promise<{ opportunity: Opportunity, source: { title: string, uri: string } | null }> => {
  
  const modelIdSearch = "gemini-2.5-flash";
  const modelIdReasoning = "gemini-2.5-flash";
  
  // Phase 1: Brainstorming & Searching (The Pain Point Radar)
  onLog?.("Scanning non-tech industries for inefficiencies...");

  const historyContext = existingTitles.length > 0 
    ? `Excluding these existing ideas: ${existingTitles.join(", ")}.`
    : "";

  // LIST OF HIGH-VALUE BORING INDUSTRIES (The "Money" Layers)
  const targetIndustries = [
    "Recruitment/Headhunting (High commission, manual filtering)",
    "Real Estate/Property Management (Paperwork heavy)",
    "Logistics/Trucking (Dispatching chaos)",
    "Legal/Compliance (Document parsing)",
    "Solar/Home Improvement Sales (Lead qualification)",
    "E-commerce Operations (Inventory reconciliation)",
    "Local Service Business (Booking/Quoting automation)"
  ].join("\n");

  const searchPrompt = `
    You are a "Cross-Industry Arbitrage Expert". Your goal is to find a business opportunity where IT is just the TOOL, not the product.

    USER CAPABILITIES (THE HAMMER):
    Skills: ${profile.coreSkills}
    Tech Stack: ${profile.techStack} (Use this to automate manual work)
    Background: ${profile.background}
    Interests: ${profile.interests}
    
    TARGET SEARCH AREA (THE NAIL):
    Focus on these "Boring but Profitable" industries:
    ${targetIndustries}
    
    HISTORY: ${historyContext}

    PROTOCOL - "THE TECH-ENABLED SERVICE" MODEL:
    1.  **Identify the Pain**: Find a highly repetitive, expensive manual task in a non-tech industry (e.g., "Headhunters spend 20 hours/week formatting CVs").
    2.  **Apply the Leverage**: How can the user's stack (Python/AI/Web) automate 80% of that task?
    3.  **The Product**: It is NOT "A SaaS for everyone". It is a "Done-For-You Service" run by code, or a specific "Micro-tool" for agencies.
    4.  **MMO/Automation**: Also consider "Make Money Online" angles like Crypto Affiliate or YouTube Automation if matches user interests, using code as leverage.

    TASK:
    1. Select ONE specific industry from the list (or a related one).
    2. Search Google for current "operational bottlenecks" or "most time consuming tasks" in that industry in 2024/2025.
    3. Hypothesize a solution where the User builds a "Robot employee" to solve it.

    EXAMPLE (Do not copy):
    - *Industry:* Headhunting.
    - *Problem:* recruiters manually match LinkedIn profiles to Job Descriptions.
    - *Solution:* A Python script that scrapes LinkedIn, scores candidates using Gemini API, and emails the recruiter the top 5 matches every morning.
  `;

  onLog?.("Investigating industry bottlenecks...");

  const client = getAiClient();
  const searchResponse = await client.models.generateContent({
    model: modelIdSearch,
    contents: searchPrompt,
    config: {
      tools: [{ googleSearch: {} }], 
    },
  });

  const marketData = searchResponse.text;
  const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const source = groundingChunks.find((c: any) => c.web)?.web || null;

  // Phase 2: Synthesis (The Business Architect)
  onLog?.("Architecting the tech-enabled solution...");

  const synthesisPrompt = `
    You are a Venture Architect. Create a concrete Opportunity Profile based on the research.

    USER STACK: ${profile.techStack}
    MARKET PAIN POINT FOUND: ${marketData}

    CRITICAL INSTRUCTIONS:
    1. **Title**: Must sound like a Business Solution, not a Dev Project (e.g., "Automated Headhunter Assistant" NOT "LinkedIn Scraper Script").
    2. **Type**: Classify as "Automation/MMO" or "Micro-SaaS".
    3. **Match Reasoning**: Explain why their SPECIFIC stack makes them dangerous in this non-tech field. (e.g. "Because you know Puppeteer/Selenium, you can replace a Data Entry Clerk").
    4. **Action Plan**: Focus on "Selling the outcome" first, then "Building the bot".
    5. **BANNED**: Do not suggest building "Developer Tools", "IDEs", or "Libraries". Focus on B2B Services or Niche Tools.

    Generate the JSON matching the Schema.
  `;

  const synthesisResponse = await client.models.generateContent({
    model: modelIdReasoning,
    contents: synthesisPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: opportunitySchema
    }
  });

  const parsedOp = JSON.parse(synthesisResponse.text);
  
  // Post-processing to ensure ID exists
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
    1. Search for existing competitors or alternatives on Google, Reddit, ProductHunt, and YouTube.
    2. Search for PRICING of similar services (monthly subs, hourly rates, fixed project costs, or affiliate commissions).
    3. Search for complaints to find weaknesses.
  `;

  onLog?.("Spy Agent searching Google, Reddit & ProductHunt...");

  const client = getAiClient();

  // Step 1: Search for competitor info
  const searchResponse = await client.models.generateContent({
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

  const analysisResponse = await client.models.generateContent({
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