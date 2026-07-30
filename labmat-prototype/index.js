require("dotenv").config();
const { app } = require("./graph");

async function run() {
  console.log("=========================================");
  console.log("   LabMat 10-Agent Graph Prototype");
  console.log("         (AvalAI Powered)         ");
  console.log("=========================================\n");

  // A realistic messy OCR output of a lab test
  const sampleOCR = `
  Test Name: Fasting Blood Sugar (FBS)
  Result: 142
  Unit: mg/dl
  Normal Range: 70 - 99
  Notes: Patient reported fasting for 8 hours.
  `;
  
  const initialState = {
    rawData: sampleOCR,
  };
  
  console.log("[System] Starting workflow with OCR Data:\n", sampleOCR);
  
  const finalState = await app.invoke(initialState);
  
  console.log("\n=========================================");
  console.log("             FINAL OUTPUT");
  console.log("=========================================\n");
  console.log(JSON.stringify(finalState.finalOutput, null, 2));
  console.log("\nTotal Loops executed for self-correction:", finalState.loopCount);
}

run().catch(console.error);
