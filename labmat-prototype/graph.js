const { StateGraph, END } = require("@langchain/langgraph");
const { LabMatState } = require("./state");
const {
  dataExtractionNode,
  validationNode,
  interpretationNode,
  interTestAnalysisNode,
  clinicalReasoningNode,
  evidenceControlNode
} = require("./agents/layer1");
const {
  patientSimplificationNode,
  doctorSpecializedNode,
  safetyAndConfidenceNode,
  finalOutputNode
} = require("./agents/layer2");

// Initialize Graph
const workflow = new StateGraph(LabMatState);

// Add Layer 1 Nodes
workflow.addNode("extractor", dataExtractionNode);
workflow.addNode("validator", validationNode);
workflow.addNode("interpreter", interpretationNode);
workflow.addNode("interTest", interTestAnalysisNode);
workflow.addNode("reasoning", clinicalReasoningNode);
workflow.addNode("evidence", evidenceControlNode);

// Add Layer 2 Nodes
workflow.addNode("patient", patientSimplificationNode);
workflow.addNode("doctor", doctorSpecializedNode);
workflow.addNode("safety", safetyAndConfidenceNode);
workflow.addNode("final", finalOutputNode);

// Add Edges (Routing Logic)
workflow.addEdge("__start__", "extractor");
workflow.addEdge("extractor", "validator");

// Conditional Routing for Validator
const shouldContinueValidation = (state) => {
  if (state.validationStatus === "invalid") return "loop_extract";
  return "interpreter";
};
workflow.addConditionalEdges("validator", shouldContinueValidation, {
  "loop_extract": "extractor",
  "interpreter": "interpreter"
});

// Parallel/Sequential after interpretation
workflow.addEdge("interpreter", "interTest");
workflow.addEdge("interTest", "reasoning");
workflow.addEdge("reasoning", "evidence");

// Conditional Routing for Evidence (The "Graph-of-Thoughts" Loop)
const shouldContinueEvidence = (state) => {
  if (state.evidenceStatus === "contradicted") return "loop_interpret";
  return "layer2";
};
workflow.addConditionalEdges("evidence", shouldContinueEvidence, {
  "loop_interpret": "interpreter",
  "layer2": "safety" // entering layer 2
});

// Layer 2 Routing
workflow.addEdge("safety", "patient");
workflow.addEdge("patient", "doctor");
workflow.addEdge("doctor", "final");
workflow.addEdge("final", END);

// Compile Graph
const app = workflow.compile();

module.exports = { app };
