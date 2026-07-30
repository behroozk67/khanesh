const { callLLM } = require("../llm");

// 7. PatientSimplificationAgent
async function patientSimplificationNode(state) {
  console.log("--- 7. [Agent] Patient Simplification ---");
  const sysPrompt = "Translate the clinical reasoning into very simple, empathetic Persian text for a patient who has no medical background. Respond with JSON: {\"text\": \"your simplified text\"}.";
  const result = await callLLM(sysPrompt, JSON.stringify({
    data: state.rawData,
    reasoning: state.clinicalReasoning
  }));
  
  return { patientText: result ? result.text : null };
}

// 8. DoctorSpecializedAgent
async function doctorSpecializedNode(state) {
  console.log("--- 8. [Agent] Doctor Specialized Report ---");
  const sysPrompt = "Generate a highly technical, concise clinical summary report for a physician based on the test data and clinical reasoning. Use medical terminology. Respond with JSON: {\"text\": \"your clinical report\"}.";
  const result = await callLLM(sysPrompt, JSON.stringify({
    data: state.rawData,
    reasoning: state.clinicalReasoning
  }));
  
  return { doctorText: result ? result.text : null };
}

// 9. Safety&ConfidenceAgent
async function safetyAndConfidenceNode(state) {
  console.log("--- 9. [Agent] Safety & Confidence ---");
  const sysPrompt = "Evaluate the safety risk of the patient based on these results (0-100 score, where 100 is perfectly safe). List any critical warnings. Respond with JSON: {\"score\": 95, \"warnings\": [\"warning 1\"]}.";
  const result = await callLLM(sysPrompt, JSON.stringify({
    data: state.rawData,
    reasoning: state.clinicalReasoning
  }));
  
  return { 
    safetyScore: result ? result.score : null, 
    safetyWarnings: result ? result.warnings : [] 
  };
}

// 10. FinalOutputAgent
async function finalOutputNode(state) {
  console.log("--- 10. [Agent] Final Output Generator ---");
  const sysPrompt = "Based on all provided data, suggest 1 or 2 complementary medical tests. Respond with JSON: {\"followUps\": [\"Test A\", \"Test B\"]}.";
  const result = await callLLM(sysPrompt, JSON.stringify({
    data: state.rawData,
    reasoning: state.clinicalReasoning
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

module.exports = {
  patientSimplificationNode,
  doctorSpecializedNode,
  safetyAndConfidenceNode,
  finalOutputNode
};
