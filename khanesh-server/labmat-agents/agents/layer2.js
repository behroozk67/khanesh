import { callLLM } from "../llm.js";

// 7. PatientSimplificationAgent
async function patientSimplificationNode(state) {
  console.log("--- 7. [Agent] Patient Simplification ---");
  const sysPrompt = `Translate the differential diagnosis into very simple, empathetic Persian text for a patient who has no medical background. 
CRITICAL RULE 1: DO NOT use unscientific or confusing phrases. 
CRITICAL RULE 2: NEVER invent meaningless Persian transliterations.
CRITICAL RULE 3: Trust only engineOutput. NEVER mention or comment on tests that are marked as \`abnormal: false\` in engineOutput. For example, if MCV is marked normal, DO NOT say "اندازه گلبول قرمز طبیعی است اما کمی بزرگتر از حد معمول است". Just completely ignore it or say it is perfectly normal.
Respond with JSON: {"text": "your simplified text"}`;
  const result = await callLLM(sysPrompt, JSON.stringify({
    context: state.context,
    diagnosis: state.differentialDiagnosis,
    engineOutput: state.engineOutput,
    patternOutput: state.patternOutput
  }));
  
  return { patientText: result ? result.text : null };
}

// 8. DoctorSpecializedAgent
async function doctorSpecializedNode(state) {
  console.log("--- 8. [Agent] Doctor Specialized Report ---");
  const sysPrompt = `Generate a highly technical, concise clinical summary report for a physician based on the test data and differential diagnosis. Use medical terminology but WRITE THE REPORT IN PERSIAN (فارسی). Integrate the CTCAE grades and precise findings from engineOutput/patternOutput. 

CRITICAL CLINICAL GUIDELINES FOR THIS REPORT:
1. You MUST strictly rely on engineOutput and patternOutput for diagnoses and reference ranges. Do NOT invent conditions like Thalassemia or Iron Deficiency if the engine marks MCV, MCH, or Ferritin as normal.
2. ONLY report abnormal values (مقادیر غیرنرمال). Do NOT present normal values.
3. When reporting values for Neutrophil, Lymphocyte, Monocyte, Eosinophil, or Basophil that are provided as absolute numbers, explicitly state that these are the "Total count" (تعداد کل).
4. For older patients who have normal MCV and Hemoglobin but decreased RBC, decreased MCH, and decreased MCHC, explicitly recommend complementary tests such as Vitamin B12.
5. You MUST provide possible diagnoses (تشخیص‌های احتمالی) matching the provided pattern, unless the diagnosis field says "هیچ تشخیص افتراقی..." or is empty, in which case omit it entirely.
6. Provide clear recommendations for further tests or clinical examinations (توصیه برای آزمایش یا معاینه بیشتر).
7. If there is isolated mild thrombocytopenia (e.g. PLT 100-150) or mild hypertriglyceridemia (e.g. TG 150-250), DO NOT mention them as signs of "Chronic Liver Disease", "Cirrhosis", or severe "Dyslipidemia". Simply note the isolated minor decrease in PLT and slight TG elevation.
8. Keep the differential realistic; do not over-diagnose based on single borderline markers.

Respond with JSON: {"text": "your clinical report"}`;
  const result = await callLLM(sysPrompt, JSON.stringify({
    context: state.context,
    diagnosis: state.differentialDiagnosis,
    engineOutput: state.engineOutput,
    patternOutput: state.patternOutput
  }));
  
  return { doctorText: result ? result.text : null };
}

// 9. Safety&ConfidenceAgent
async function safetyAndConfidenceNode(state) {
  console.log("--- 9. [Agent] Safety & Confidence ---");
  const sysPrompt = "Evaluate the safety risk of the patient based on these results (0-100 score, where 100 is perfectly safe). Factor in any emergency/critical warnings from patternOutput. Write the warnings in Persian (فارسی). Respond with JSON: {\"score\": 95, \"warnings\": [\"هشدار ۱\"]}";
  const result = await callLLM(sysPrompt, JSON.stringify({
    context: state.context,
    diagnosis: state.differentialDiagnosis,
    engineOutput: state.engineOutput,
    patternOutput: state.patternOutput
  }));
  
  return { 
    safetyScore: result ? result.score : null, 
    safetyWarnings: result ? result.warnings : [] 
  };
}

// 10. FinalOutputAgent
async function finalOutputNode(state) {
  console.log("--- 10. [Agent] Final Output Generator ---");
  const sysPrompt = "Based on all provided data, suggest 1 or 2 complementary medical tests. Write the test names or suggestions in Persian (فارسی). Respond with JSON: {\"followUps\": [\"آزمایش الف\", \"معاینه ب\"]}";
  const result = await callLLM(sysPrompt, JSON.stringify({
    context: state.context,
    diagnosis: state.differentialDiagnosis,
    engineOutput: state.engineOutput
  }));

  const final = {
    patientSection: state.patientText,
    doctorSection: state.doctorText,
    safetyDetails: {
      score: state.safetyScore,
      warnings: state.safetyWarnings
    },
    suggestedFollowUps: result ? result.followUps : []
  };
  
  return { finalOutput: final };
}

export {
  patientSimplificationNode,
  doctorSpecializedNode,
  safetyAndConfidenceNode,
  finalOutputNode
};
