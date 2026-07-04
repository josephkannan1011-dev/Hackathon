import { GoogleGenAI, Type } from '@google/genai';
import { ComplaintPriority } from '../src/types';

// Rule-Based Decision Engine Definitions
export interface AIResult {
  summary: string;
  category: string;
  departmentId: string;
  severity: number;
  priority: ComplaintPriority;
  priorityScore: number;
  reasoning: string;
  engineUsed: 'Gemini-3.5-Flash' | 'Rule-Based-Local';
}

const CATEGORY_MAPPINGS = [
  {
    deptId: 'PWD',
    category: 'Road Potholes & Infrastructure',
    keywords: ['road', 'pothole', 'highway', 'crack', 'bridge', 'street repair', 'tarmac', 'flyover', 'sidewalk', 'pavement']
  },
  {
    deptId: 'MUN',
    category: 'Garbage & Sanitation',
    keywords: ['garbage', 'waste', 'trash', 'cleanliness', 'foul', 'sanitation', 'dustbin', 'bin', 'litter', 'refuse', 'dumping', 'sewage', 'drainage', 'gutter', 'drain']
  },
  {
    deptId: 'ELE',
    category: 'Street Light & Electricals',
    keywords: ['light', 'street light', 'wire', 'cable', 'electricity', 'electric', 'pole', 'blackout', 'spark', 'transformer', 'powercut', 'power outage']
  },
  {
    deptId: 'WAT',
    category: 'Water Supply & Leakage',
    keywords: ['water', 'leak', 'leakage', 'pipeline', 'burst', 'supply', 'drinking water', 'tap', 'no water', 'muddy water']
  },
  {
    deptId: 'POL',
    category: 'Environmental Pollution',
    keywords: ['dumping', 'pollute', 'pollution', 'smoke', 'chemical', 'industrial waste', 'toxic', 'air quality', 'noise', 'factory discharge']
  },
  {
    deptId: 'HEA',
    category: 'Public Health & Medical Services',
    keywords: ['health', 'hospital', 'disease', 'outbreak', 'mosquito', 'dengue', 'clinic', 'medical', 'stagnant water', 'sanitization', 'epidemic']
  },
  {
    deptId: 'AGR',
    category: 'Agriculture & Rural Development',
    keywords: ['crop', 'agriculture', 'farm', 'pesticide', 'fertilizer', 'soil', 'irrigation', 'livestock', 'veterinary']
  }
];

export function runRuleBasedEngine(
  title: string,
  description: string,
  isEmergency: boolean,
  nearbyCount: number = 0,
  userSelectedCategory?: string
): AIResult {
  const combined = `${title.toLowerCase()} ${description.toLowerCase()}`;
  
  // 1. Detect Department & Category
  let matchedDept = 'MUN'; // Default
  let matchedCategory = 'General Municipal Issues';
  let maxMatches = 0;

  const categoryToDept: Record<string, string> = {
    'Road Potholes & Infrastructure': 'PWD',
    'Road Potholes & Cracks': 'PWD',
    'Garbage & Sanitation': 'MUN',
    'Street Light & Electricals': 'ELE',
    'Water Supply & Leakage': 'WAT',
    'Water Leakage & Drainage': 'WAT',
    'Environmental Pollution': 'POL',
    'Public Health & Medical Services': 'HEA',
    'Agriculture & Rural Development': 'AGR'
  };

  if (userSelectedCategory && categoryToDept[userSelectedCategory]) {
    matchedDept = categoryToDept[userSelectedCategory];
    matchedCategory = userSelectedCategory;
  } else {
    for (const item of CATEGORY_MAPPINGS) {
      let matches = 0;
      for (const keyword of item.keywords) {
        if (combined.includes(keyword)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        matchedDept = item.deptId;
        matchedCategory = item.category;
      }
    }
  }

  // 2. Predict Severity (1 to 5)
  let severity = 3; // default
  const criticalKeywords = ['sparking', 'exposed wire', 'fire', 'flood', 'collapse', 'accident', 'injury', 'danger', 'hazard', 'toxic', 'poisonous'];
  const minorKeywords = ['small', 'minor', 'cosmetic', 'low priority', 'clean up later', 'dusty'];

  if (criticalKeywords.some(kw => combined.includes(kw))) {
    severity = 5;
  } else if (minorKeywords.some(kw => combined.includes(kw))) {
    severity = 2;
  } else if (maxMatches > 3) {
    severity = 4;
  }

  // 3. Calculate Priority Score (1-100)
  let score = 20; // Base score
  
  // Factor A: Severity multiplier
  score += severity * 8; // Max +40

  // Factor B: Emergency flags
  if (isEmergency) {
    score += 35;
  } else if (criticalKeywords.some(kw => combined.includes(kw))) {
    score += 20;
  }

  // Factor C: Repeated complaints nearby
  score += Math.min(nearbyCount * 5, 20); // Max +20

  // Factor D: Vulnerable/high impact zones
  if (combined.includes('school') || combined.includes('hospital') || combined.includes('clinic') || combined.includes('market')) {
    score += 15;
  }

  // Factor E: Traffic or logistics disruption
  if (combined.includes('traffic') || combined.includes('block') || combined.includes('jam') || combined.includes('congestion')) {
    score += 15;
  }

  // Clamp priority score between 1 and 100
  score = Math.min(Math.max(score, 1), 100);

  // Determine Priority Level
  let priority: ComplaintPriority = 'medium';
  if (score >= 85) {
    priority = 'critical';
  } else if (score >= 65) {
    priority = 'high';
  } else if (score < 40) {
    priority = 'low';
  }

  // Summary generator
  const deptNames: Record<string, string> = {
    PWD: 'Public Works',
    MUN: 'Municipality',
    ELE: 'Electricity',
    WAT: 'Water Supply',
    POL: 'Pollution Control',
    HEA: 'Health',
    AGR: 'Agriculture'
  };
  const summary = `Complaint regarding ${title}. Local analysis indicates a ${priority} priority issue assigned to the ${deptNames[matchedDept] || 'Municipality'} Department.`;

  return {
    summary,
    category: matchedCategory,
    departmentId: matchedDept,
    severity,
    priority,
    priorityScore: score,
    reasoning: `Matched keywords in title/description (Local Rule-Based Analysis). Emergency status: ${isEmergency}. Associated complaints nearby: ${nearbyCount}.`,
    engineUsed: 'Rule-Based-Local'
  };
}

export async function runHybridAIEngine(
  title: string,
  description: string,
  isEmergency: boolean,
  nearbyCount: number = 0,
  userSelectedCategory?: string
): Promise<AIResult> {
  const localResult = runRuleBasedEngine(title, description, isEmergency, nearbyCount, userSelectedCategory);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    console.log('[AI Engine] No Gemini API key detected. Using local Rule-Based Engine.');
    return localResult;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemPrompt = `You are an expert AI Classifier for CivicLens AI, a Smart Governance Complaint Management System.
Analyze the citizen's complaint (Title, Description, and Emergency Flag) and provide classification data.
Output MUST be valid JSON matching the exact schema provided.
You must recommend one of the following Department IDs:
- 'PWD' (for roads, potholes, pavement, bridge repairs, street infrastructure)
- 'MUN' (for garbage, waste dumping, sanitation, drainage, gutters, sewage blockages)
- 'ELE' (for street lights, electricity poles, sparks, power outages, hanging wires)
- 'WAT' (for pipeline leakage, drinking water shortage, burst mains, muddy water supply)
- 'POL' (for industrial pollution, toxic dumping, heavy smog, illegal commercial burning)
- 'HEA' (for hospital hazards, clinics, mosquito outbreaks/pest breeding, stagnant water causing disease risk)
- 'AGR' (for farming, pesticide runoff, soil issues, crop health problems)

CRITICAL REQUIREMENT: If the citizen provided a specific category in "userSelectedCategory", you MUST select the departmentId mapped to that category (e.g., 'Road Potholes & Infrastructure' -> 'PWD', 'Garbage & Sanitation' -> 'MUN', 'Street Light & Electricals' -> 'ELE', 'Water Supply & Leakage' -> 'WAT', 'Environmental Pollution' -> 'POL', 'Public Health & Medical Services' -> 'HEA', 'Agriculture & Rural Development' -> 'AGR').

Select an accurate severity score (1-5) and priority level ('low', 'medium', 'high', 'critical').
Calculate a priority score (1-100) based on severity, emergency status, nearby vulnerable institutions (schools, hospitals), and potential public disruption.`;

    const userPrompt = `Title: "${title}"
Description: "${description}"
Is Handmarked Emergency: ${isEmergency}
Nearby Similar Reports count: ${nearbyCount}
userSelectedCategory: "${userSelectedCategory || 'Not Provided'}"`;

    console.log('[AI Engine] Querying Gemini model gemini-3.5-flash...');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'A crisp, professional, human-style summary of the issue (12-18 words maximum). E.g. "Severe pothole at school crossroad causing traffic hazard."'
            },
            category: {
              type: Type.STRING,
              description: 'Specific sub-category name, e.g. "Overhead Electrical Line Hazard", "Bituminous Pothole Repair", "Sewer Line Backflow"'
            },
            departmentId: {
              type: Type.STRING,
              description: "Must be exactly one of: 'PWD', 'MUN', 'ELE', 'WAT', 'POL', 'HEA', 'AGR'"
            },
            severity: {
              type: Type.INTEGER,
              description: 'Severity score between 1 (cosmetic/minor) and 5 (highly dangerous/life-threatening)'
            },
            priority: {
              type: Type.STRING,
              description: "Must be exactly one of: 'low', 'medium', 'high', 'critical'"
            },
            priorityScore: {
              type: Type.INTEGER,
              description: 'Priority score between 1 and 100 based on threat level and risk factors.'
            },
            reasoning: {
              type: Type.STRING,
              description: 'Brief 1-sentence analytical reasoning behind these metrics.'
            }
          },
          required: ['summary', 'category', 'departmentId', 'severity', 'priority', 'priorityScore', 'reasoning']
        }
      }
    });

    const responseText = response.text;
    if (responseText) {
      const parsed = JSON.parse(responseText.trim());
      
      // Ensure departmentId is valid, fallback if not
      const validDepts = ['PWD', 'MUN', 'ELE', 'WAT', 'POL', 'HEA', 'AGR'];
      if (!validDepts.includes(parsed.departmentId)) {
        parsed.departmentId = localResult.departmentId;
      }

      // Ensure priority is valid
      const validPriorities: ComplaintPriority[] = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(parsed.priority)) {
        parsed.priority = localResult.priority;
      }

      console.log('[AI Engine] Gemini response compiled successfully!');
      return {
        summary: parsed.summary,
        category: parsed.category,
        departmentId: parsed.departmentId,
        severity: Math.min(Math.max(parsed.severity, 1), 5),
        priority: parsed.priority,
        priorityScore: Math.min(Math.max(parsed.priorityScore, 1), 100),
        reasoning: parsed.reasoning,
        engineUsed: 'Gemini-3.5-Flash'
      };
    } else {
      throw new Error('Empty response text from Gemini');
    }
  } catch (err) {
    console.error('[AI Engine] Gemini failed or returned invalid response, falling back to Rule-Based Engine:', err);
    return {
      ...localResult,
      reasoning: `${localResult.reasoning} (Gemini fallback triggered due to API error).`
    };
  }
}

// Chatbot Assist Engine
export async function runChatbotAssist(
  chatHistory: { role: 'user' | 'model'; content: string }[]
): Promise<{ reply: string; suggestedDept?: string; prefillForm?: { title: string; description: string; category: string } }> {
  
  const lastMessage = chatHistory[chatHistory.length - 1]?.content || '';
  const ruleBasedClassification = runRuleBasedEngine(lastMessage, '', false, 0);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    // Elegant fallback chatbot response
    const deptNames: Record<string, string> = {
      PWD: 'Public Works (Roads, Pavements)',
      MUN: 'Municipality (Garbage, Drainage)',
      ELE: 'Electricity (Wiring, Street Lights)',
      WAT: 'Water Supply (Pipeline leakages)',
      POL: 'Pollution Control (Environmental hazards)',
      HEA: 'Health (Sanitation, Outbreak risks)',
      AGR: 'Agriculture (Crop and land issues)'
    };

    const isMatch = ruleBasedClassification.priorityScore > 30;
    let reply = `I've analyzed your concern. Based on your description, this sounds like an issue for the **${deptNames[ruleBasedClassification.departmentId]}** department.\n\nWould you like me to help draft a formal complaint for this issue? Just click the button below to pre-fill the form!`;
    
    if (!isMatch) {
      reply = "Hello! I am your CivicLens AI Smart Governance assistant. You can describe any civic issues (such as broken street lights, potholes, water leaks, or garbage accumulation) and I will suggest the right department and help you file a complaint. How can I assist you today?";
    }

    return {
      reply,
      suggestedDept: ruleBasedClassification.departmentId,
      prefillForm: isMatch ? {
        title: lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage,
        description: lastMessage,
        category: ruleBasedClassification.category,
      } : undefined
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const systemPrompt = `You are CivicLens AI, a highly professional, polite Smart Governance Assistant.
You help citizens analyze civic problems, suggest which department handles them, and formulate complaints.
If the citizen is describing a reportable civic issue:
1. Comfort them that the system is ready to help resolve it.
2. Clearly explain which department handles it and why.
3. Keep your response brief, informative, and under 80 words.
4. Output your response as a JSON object containing:
   - "reply": The message to show to the user (use Markdown formatting nicely).
   - "isComplaint": true if they described a real civic issue, false if it's general greeting/chit-chat.
   - "suggestedDepartmentId": One of 'PWD', 'MUN', 'ELE', 'WAT', 'POL', 'HEA', 'AGR' (or empty if not a complaint).
   - "title": A short suggested title (5-6 words) for the complaint.
   - "category": A suggested sub-category name.
   - "description": A beautifully formatted description drafting of the complaint based on their input.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: chatHistory.map(h => `${h.role === 'user' ? 'Citizen' : 'CivicLens AI'}: ${h.content}`).join('\n'),
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            isComplaint: { type: Type.BOOLEAN },
            suggestedDepartmentId: { type: Type.STRING },
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['reply', 'isComplaint']
        }
      }
    });

    const resText = response.text;
    if (resText) {
      const parsed = JSON.parse(resText.trim());
      if (parsed.isComplaint && parsed.suggestedDepartmentId) {
        return {
          reply: parsed.reply,
          suggestedDept: parsed.suggestedDepartmentId,
          prefillForm: {
            title: parsed.title || 'Civic Issue Reported',
            description: parsed.description || lastMessage,
            category: parsed.category || 'General'
          }
        };
      } else {
        return { reply: parsed.reply };
      }
    }
    throw new Error('Failed to parse chatbot response');
  } catch (err) {
    console.error('[AI Chatbot] Gemini chatbot failed, falling back:', err);
    // Return local logic
    return {
      reply: `I've analyzed your concern. Based on your description, this sounds like an issue for the **Public Works** or **Municipality** department. Would you like me to help draft a formal complaint for this issue? Click the button below to pre-fill the form!`,
      suggestedDept: 'MUN',
      prefillForm: {
        title: lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage,
        description: lastMessage,
        category: 'General Municipal Issues'
      }
    };
  }
}
