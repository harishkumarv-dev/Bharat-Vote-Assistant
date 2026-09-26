/**
 * Clinical Export Module: Generates a printable Health Passport Summary
 */

export function printHealthPassport(profile, activeMeds, lastTriage, vitalsHistory) {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  
  const sysLatest = vitalsHistory && vitalsHistory.bpSys ? vitalsHistory.bpSys[vitalsHistory.bpSys.length - 1] : profile.vitals.bloodPressureSys;
  const diaLatest = vitalsHistory && vitalsHistory.bpDia ? vitalsHistory.bpDia[vitalsHistory.bpDia.length - 1] : profile.vitals.bloodPressureDia;
  const hrLatest = vitalsHistory && vitalsHistory.hr ? vitalsHistory.hr[vitalsHistory.hr.length - 1] : profile.vitals.heartRate;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AuraCare Health Passport - ${profile.name}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
    .header { border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; color: #0284c7; font-size: 26px; }
    .header .subtitle { font-size: 13px; color: #64748b; }
    .badge { background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 12px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 10px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .value { font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 14px; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>AuraCare AI Health Passport</h1>
      <div class="subtitle">Clinical Summary Report & Patient Vitals Overview</div>
    </div>
    <div>
      <span class="badge">Generated: ${new Date().toLocaleDateString()}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Patient Identification & Demographics</div>
    <div class="grid">
      <div class="card">
        <div class="label">Patient Name</div>
        <div class="value">${profile.name}</div>
        <div class="label" style="margin-top: 10px;">Age / Gender</div>
        <div class="value">${profile.age} Years / ${profile.gender}</div>
      </div>
      <div class="card">
        <div class="label">Primary Conditions</div>
        <div class="value">${profile.conditions?.join(', ') || 'None'}</div>
        <div class="label" style="margin-top: 10px;">Documented Allergies</div>
        <div class="value" style="color: #dc2626;">${profile.allergies?.join(', ') || 'None'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Recent Vitals Baseline</div>
    <div class="grid">
      <div class="card">
        <div class="label">Blood Pressure</div>
        <div class="value">${sysLatest} / ${diaLatest} mmHg</div>
      </div>
      <div class="card">
        <div class="label">Resting Heart Rate</div>
        <div class="value">${hrLatest} BPM</div>
      </div>
      <div class="card">
        <div class="label">Blood Glucose</div>
        <div class="value">${profile.vitals.glucose} mg/dL</div>
      </div>
      <div class="card">
        <div class="label">Oxygen Saturation (SpO2)</div>
        <div class="value">${profile.vitals.spO2}%</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Active Medication Regimen</div>
    <table>
      <thead>
        <tr>
          <th>Medication</th>
          <th>Dosage</th>
          <th>Frequency</th>
        </tr>
      </thead>
      <tbody>
        ${activeMeds.map(m => `
          <tr>
            <td><strong>${typeof m === 'string' ? m : m.name}</strong></td>
            <td>${m.dosage || 'Standard'}</td>
            <td>${m.frequency || 'Daily'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${lastTriage ? `
  <div class="section">
    <div class="section-title">Latest Symptom Triage Assessment</div>
    <div class="card" style="border-left: 4px solid ${lastTriage.level === 'EMERGENCY' ? '#ef4444' : '#0284c7'};">
      <div class="label">Triage Level & Disposition</div>
      <div class="value" style="font-size: 16px;">${lastTriage.title} (Risk Score: ${lastTriage.riskScore}%)</div>
      <p style="font-size: 13px; color: #475569; margin: 8px 0 0 0;">${lastTriage.recommendation}</p>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    Disclaimers: AuraCare AI is an intelligent clinical decision support system designed for Prompt Wars 5. This summary is intended to assist medical professionals during consultations and does not replace formal clinical diagnostics.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
