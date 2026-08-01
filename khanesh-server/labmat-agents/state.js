import { Annotation } from "@langchain/langgraph";

// Define the State of our Graph (Parallel Architecture)
const LabMatState = Annotation.Root({
  rawData: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  engineOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  patternOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  
  // Phase 6: New Parallel Architecture States
  context: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  cbcAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  biochemAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  hormoneAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  microbioAnalysis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  crossTestReasoning: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  differentialDiagnosis: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  evidenceStatus: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "pending", // pending, verified, contradicted
  }),
  loopCount: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  
  // Layer 2 States
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
    default: () => null,
  }),
  safetyWarnings: Annotation({
    reducer: (x, y) => (y ? [...(x || []), ...y] : x),
    default: () => [],
  }),
  finalOutput: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  })
});

export { LabMatState };
