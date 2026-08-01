import { callLLM } from "../llm.js";

// 1. Context Collection Agent
async function contextCollectionNode(state) {
  console.log("--- 1. [Agent] Context Collection ---");
  const sysPrompt = "You are a context collector. Extract patient demographics (age, sex) and any known conditions from the raw data. Respond ONLY with JSON: {\"context\": \"string representing patient context\"}";
  const result = await callLLM(sysPrompt, JSON.stringify(state.rawData));
  return { context: result ? result.context : null };
}

// 2. Specialized Parallel Agents
async function cbcAgentNode(state) {
  console.log("--- [Agent] CBC Specialist ---");
  const sysPrompt = "You are a Hematologist (CBC Expert). Analyze ONLY the hematology results from engineOutput. CRITICAL: ALWAYS use the reference ranges, abnormality status, and tags provided in engineOutput as the absolute truth. DO NOT invent or hallucinate diagnoses like Thalassemia or Iron Deficiency if the engineOutput marks relevant parameters (like MCV, MCH, Ferritin) as normal. Respond with JSON: {\"analysis\": \"your CBC specific analysis\"}";
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    engineOutput: state.engineOutput,
    context: state.context
  }));
  return { cbcAnalysis: result ? result.analysis : null };
}

async function biochemAgentNode(state) {
  console.log("--- [Agent] Biochem Specialist ---");
  const sysPrompt = "You are a Biochemist (Biochemistry Expert). Analyze ONLY the biochemistry, liver, and kidney results (Glucose, Creatinine, AST, ALT, etc.) from engineOutput. Use the engineOutput for exact references and CTCAE grades. If no Biochem tests are present, return null. Respond with JSON: {\"analysis\": \"your Biochem specific analysis\"}";
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    engineOutput: state.engineOutput,
    context: state.context
  }));
  return { biochemAnalysis: result ? result.analysis : null };
}

async function hormoneAgentNode(state) {
  console.log("--- [Agent] Hormone Specialist ---");
  const sysPrompt = "You are an Endocrinologist (Hormone Expert). Analyze ONLY the hormone and thyroid results (TSH, T4, Prolactin, etc.) from engineOutput. Use the engineOutput for exact references and CTCAE grades. If no Hormone tests are present, return null. Respond with JSON: {\"analysis\": \"your Hormone specific analysis\"}";
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    engineOutput: state.engineOutput,
    context: state.context
  }));
  return { hormoneAnalysis: result ? result.analysis : null };
}

async function microbioAgentNode(state) {
  console.log("--- [Agent] Microbiology Specialist ---");
  const sysPrompt = "You are a Microbiologist / Infectious Disease Expert. Analyze ONLY the urine analysis (U/A), urine culture, stool, and antibiograms from engineOutput. Evaluate sensitive/resistant antibiotics if present. If no microbiology tests are present, return null. Respond with JSON: {\"analysis\": \"your Microbiology specific analysis\"}";
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    engineOutput: state.engineOutput,
    context: state.context
  }));
  return { microbioAnalysis: result ? result.analysis : null };
}

// 3. Cross-Test Reasoning Agent
async function crossTestReasoningNode(state) {
  console.log("--- [Agent] Cross-Test Reasoning ---");
  const sysPrompt = "You are a Senior Diagnostician. Review the findings from CBC, Biochem, Hormone, and Microbio experts. Synthesize them to find correlations. CRITICAL: You MUST respect the determinist engineOutput and patternOutput. If engineOutput marks a parameter as normal, NEVER describe it as 'slightly large' or abnormal. Do NOT invent diseases like Thalassemia or Iron Deficiency if the engine explicitly marks related markers (like MCV or Ferritin) as normal. Respond with JSON: {\"reasoning\": \"your synthesized reasoning\"}";
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    cbc: state.cbcAnalysis,
    biochem: state.biochemAnalysis,
    hormone: state.hormoneAnalysis,
    microbio: state.microbioAnalysis,
    patternOutput: state.patternOutput,
    context: state.context
  }));
  return { crossTestReasoning: result ? result.reasoning : null };
}

// 4. Differential Diagnosis Agent
async function differentialDiagnosisNode(state) {
  console.log("--- [Agent] Differential Diagnosis ---");
  const sysPrompt = `You are a Diagnostic AI. ONLY generate a differential diagnosis if the engine's \`patternOutput.findings\` contains explicit clinical patterns or emergencies. 
CRITICAL RULE 1: If \`patternOutput.findings\` is empty or only contains minor isolated abnormalities without a pattern, return an empty string or "هیچ تشخیص افتراقی نگران‌کننده‌ای مطرح نیست". 
CRITICAL RULE 2: DO NOT over-diagnose based on isolated markers (e.g. do not suggest anemia, MDS, or renal failure if RBC is slightly low but HGB is normal).
CRITICAL RULE 3: You MUST strictly adhere to patternOutput and engineOutput. If a parameter like MCV is normal, do NOT suggest Thalassemia or Iron Deficiency.
Respond with JSON: {"diagnosis": "your list of potential conditions, or empty if none"}`;
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    crossTestReasoning: state.crossTestReasoning,
    patternOutput: state.patternOutput,
    context: state.context
  }));
  return { differentialDiagnosis: result ? result.diagnosis : null };
}

// 5. Evidence Control Agent
async function evidenceControlNode(state) {
  console.log("--- [Agent] Evidence Checker ---");
  const sysPrompt = "Cross check the differential diagnosis against standard medical guidelines. Ensure no deterministic CTCAE findings from patternOutput were contradicted. Respond with JSON: {\"status\": \"verified\" | \"contradicted\"}";
  const result = await callLLM(sysPrompt, JSON.stringify({
    diagnosis: state.differentialDiagnosis,
    patternOutput: state.patternOutput
  }));
  
  let status = result ? result.status : "verified";
  let loop = state.loopCount;

  if (status === "contradicted" && loop === 0) {
    console.log("   > Evidence Contradiction! Need re-diagnosis.");
    loop += 1;
  } else if (status === "contradicted") {
     console.log("   > Loop limit reached. Forcing verification for now.");
     status = "verified";
  }
  
  return { evidenceStatus: status, loopCount: loop };
}

export {
  contextCollectionNode,
  cbcAgentNode,
  biochemAgentNode,
  hormoneAgentNode,
  microbioAgentNode,
  crossTestReasoningNode,
  differentialDiagnosisNode,
  evidenceControlNode
};
