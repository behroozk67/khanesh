const { Annotation } = require("@langchain/langgraph");

// Define the State of our Graph
const LabMatState = Annotation.Root({
  rawData: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  validationStatus: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "pending", // pending, valid, invalid
  }),
  validationErrors: Annotation({
    reducer: (x, y) => (y ? [...(x || []), ...y] : x),
    default: () => [],
  }),
  interpretations: Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  interTestAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  clinicalReasoning: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  evidenceStatus: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "pending", // pending, verified, contradicted
  }),
  patientText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  doctorText: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  safetyScore: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null, // e.g., 0-100
  }),
  safetyWarnings: Annotation({
    reducer: (x, y) => (y ? [...(x || []), ...y] : x),
    default: () => [],
  }),
  finalOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  loopCount: Annotation({
    reducer: (x, y) => x + (y || 0),
    default: () => 0,
  }),
});

module.exports = { LabMatState };
