import { StateGraph, END } from "@langchain/langgraph";
import { LabMatState } from "./state.js";
import {
  contextCollectionNode,
  cbcAgentNode,
  biochemAgentNode,
  hormoneAgentNode,
  microbioAgentNode,
  crossTestReasoningNode,
  differentialDiagnosisNode,
  evidenceControlNode
} from "./agents/layer1.js";
import {
  patientSimplificationNode,
  doctorSpecializedNode,
  safetyAndConfidenceNode,
  finalOutputNode
} from "./agents/layer2.js";

// Initialize Graph
const workflow = new StateGraph(LabMatState);

// Add Layer 1 Nodes (Parallel Architecture)
workflow.addNode("contextNode", contextCollectionNode);
workflow.addNode("cbc", cbcAgentNode);
workflow.addNode("biochem", biochemAgentNode);
workflow.addNode("hormone", hormoneAgentNode);
workflow.addNode("microbio", microbioAgentNode);
workflow.addNode("crossTest", crossTestReasoningNode);
workflow.addNode("diagnosis", differentialDiagnosisNode);
workflow.addNode("evidence", evidenceControlNode);

// Add Layer 2 Nodes
workflow.addNode("patient", patientSimplificationNode);
workflow.addNode("doctor", doctorSpecializedNode);
workflow.addNode("safety", safetyAndConfidenceNode);
workflow.addNode("final", finalOutputNode);

// Add Edges (Routing Logic)
workflow.addEdge("__start__", "contextNode");

// Fan-out: Parallel execution of specialized agents
workflow.addEdge("contextNode", "cbc");
workflow.addEdge("contextNode", "biochem");
workflow.addEdge("contextNode", "hormone");
workflow.addEdge("contextNode", "microbio");

// Fan-in: All specialists converge to Cross-Test Reasoning
workflow.addEdge("cbc", "crossTest");
workflow.addEdge("biochem", "crossTest");
workflow.addEdge("hormone", "crossTest");
workflow.addEdge("microbio", "crossTest");

// Sequential Diagnostic flow
workflow.addEdge("crossTest", "diagnosis");
workflow.addEdge("diagnosis", "evidence");

// Conditional Routing for Evidence (Graph-of-Thoughts Loop)
const shouldContinueEvidence = (state) => {
  if (state.evidenceStatus === "contradicted") return "loop_context";
  return "layer2";
};
workflow.addConditionalEdges("evidence", shouldContinueEvidence, {
  "loop_context": "contextNode",
  "layer2": "safety" // entering layer 2
});

// Layer 2 Routing
workflow.addEdge("safety", "patient");
workflow.addEdge("patient", "doctor");
workflow.addEdge("doctor", "final");
workflow.addEdge("final", END);

// Compile Graph
const app = workflow.compile();

export { app };
