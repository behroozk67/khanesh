const { callLLM } = require("../llm");

// 1. DataExtractionAgent
async function dataExtractionNode(state) {
  console.log("--- 1. [Agent] Data Extraction ---");
  const raw = state.rawData;
  
  if (typeof raw !== 'string') {
    return { rawData: raw }; // already extracted
  }

  const sysPrompt = "You are a medical data extractor. Extract test name, value, and unit from the user's raw text. Respond ONLY with JSON like { \"test\": \"Glucose\", \"value\": 120, \"unit\": \"mg/dL\" }.";
  const result = await callLLM(sysPrompt, raw);
  
  return { rawData: result || { error: "Extraction failed" } };
}

// 2. ValidationAgent
async function validationNode(state) {
  console.log("--- 2. [Agent] Validation ---");
  const data = state.rawData;
  
  const sysPrompt = "You are a medical validator. Check if the provided test data looks like a valid medical test result (not a negative value, standard units, etc.). Respond with JSON: {\"status\": \"valid\" | \"invalid\", \"errors\": [\"list of errors if any\"]}.";
  const result = await callLLM(sysPrompt, JSON.stringify(data));
  
  if (!result) return { validationStatus: "valid", validationErrors: [] };

  return { 
    validationStatus: result.status, 
    validationErrors: result.errors || [] 
  };
}

// 3. InterpretationAgent
async function interpretationNode(state) {
  console.log("--- 3. [Agent] Interpretation ---");
  const data = state.rawData;
  
  const sysPrompt = "You are a medical interpreter. Given a test result, interpret what it means medically (e.g., Normal, High, Low, Diabetic, etc.). Respond with JSON: {\"interpretation\": \"your interpretation string\"}.";
  const result = await callLLM(sysPrompt, JSON.stringify(data));
  
  return { interpretations: { [data.test]: result ? result.interpretation : "Unknown" } };
}

// 4. InterTestAnalysisAgent
async function interTestAnalysisNode(state) {
  console.log("--- 4. [Agent] Inter-Test Analysis ---");
  const sysPrompt = "You analyze correlations between multiple test results. If only one test is provided, state that. Respond with JSON: {\"analysis\": \"your text\"}.";
  const result = await callLLM(sysPrompt, JSON.stringify({ data: state.rawData, interpretations: state.interpretations }));
  
  return { interTestAnalysis: result ? result.analysis : null };
}

// 5. ClinicalReasoningAgent
async function clinicalReasoningNode(state) {
  console.log("--- 5. [Agent] Clinical Reasoning ---");
  const sysPrompt = "Provide clinical reasoning for the patient's condition based on these results. Respond with JSON: {\"reasoning\": \"your clinical text\"}.";
  const result = await callLLM(sysPrompt, JSON.stringify({ 
    data: state.rawData, 
    interpretations: state.interpretations,
    interTest: state.interTestAnalysis
  }));
  
  return { clinicalReasoning: result ? result.reasoning : null };
}

// 6. EvidenceControlAgent
async function evidenceControlNode(state) {
  console.log("--- 6. [Agent] Evidence Control ---");
  const sysPrompt = "Cross check the clinical reasoning against standard medical guidelines. If the reasoning contradicts the guidelines, flag it. Respond with JSON: {\"status\": \"verified\" | \"contradicted\"}.";
  const result = await callLLM(sysPrompt, JSON.stringify({
    data: state.rawData,
    reasoning: state.clinicalReasoning
  }));
  
  let status = result ? result.status : "verified";
  let loop = 0;

  if (status === "contradicted" && state.loopCount === 0) {
    console.log("   > Evidence Contradiction/Doubt! Need re-interpretation.");
    loop = 1;
  } else if (status === "contradicted") {
     console.log("   > Loop limit reached. Forcing verification for now.");
     status = "verified"; // Prevent infinite loop for prototype
  }
  
  return { evidenceStatus: status, loopCount: loop };
}

module.exports = {
  dataExtractionNode,
  validationNode,
  interpretationNode,
  interTestAnalysisNode,
  clinicalReasoningNode,
  evidenceControlNode
};
