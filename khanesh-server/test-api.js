const body = JSON.stringify({
  testResults: "dummy",
  tests: [
    { name: 'R.B.C', value: 3.82, reference: '4.5-5.9' },
    { name: 'Hb', value: 12.3, reference: '13.5-17.5' },
    { name: 'H.C.T', value: 38.6, reference: '41.5-50.4' },
    { name: 'M.C.V', value: 101.0, reference: '80-96' },
    { name: 'M.C.H', value: 32.2, reference: '27.5-33.2' }
  ],
  patient: { age: '78', sex: 'M' }
});

fetch("http://localhost:8787/api/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body
})
.then(res => res.json())
.then(data => {
  if (data.error) {
    console.error(data.error);
    return;
  }
  console.log("=== PATIENT SECTION (SIMPLE) ===");
  console.log(data.labmat.patientSection);
  console.log("\n=== DOCTOR SECTION (TECHNICAL) ===");
  console.log(data.labmat.doctorSection);
})
.catch(console.error);
