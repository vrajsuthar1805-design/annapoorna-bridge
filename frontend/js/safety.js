// Annapoorna Bridge Food Safety & FSSAI Compliance Calculator

document.addEventListener('DOMContentLoaded', async () => {
  await loadFssaiGuidelines();

  // Set default calculator cooked time to now
  const calcCooked = document.getElementById('calcCookedTime');
  if (calcCooked) {
    const d = new Date();
    calcCooked.value = d.toISOString().slice(0, 16);
  }

  const calcBtn = document.getElementById('btnCalculateShelfLife');
  if (calcBtn) {
    calcBtn.addEventListener('click', calculateShelfLife);
  }
});

async function loadFssaiGuidelines() {
  try {
    const res = await apiRequest('/metrics/fssai-guidelines');
    if (!res.success) return;

    const g = res.guidelines;

    // Render Temperature Rules
    const tempContainer = document.getElementById('temperatureRulesContainer');
    if (tempContainer && g.temperature_rules) {
      tempContainer.innerHTML = g.temperature_rules.map(r => `
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm);">
          <div style="font-size: 0.8rem; font-weight: 700; color: #15803d; text-transform: uppercase; margin-bottom: 6px;">
            ${r.category}
          </div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
            ${r.critical_limit}
          </div>
          <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5;">${r.requirement}</p>
        </div>
      `).join('');
    }

    // Render Prohibited List
    const prohibitedList = document.getElementById('prohibitedFoodsList');
    if (prohibitedList && g.prohibited_high_risk_items) {
      prohibitedList.innerHTML = g.prohibited_high_risk_items.map(item => `
        <li style="margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px; font-size: 0.92rem; color: #991b1b;">
          <span style="font-size: 1.1rem; line-height: 1;">🚫</span>
          <span>${item}</span>
        </li>
      `).join('');
    }

    // Render Mandatory Checklist
    const checklist = document.getElementById('mandatoryChecklist');
    if (checklist && g.mandatory_checklist) {
      checklist.innerHTML = g.mandatory_checklist.map(item => `
        <li style="margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px; font-size: 0.92rem; color: #166534;">
          <span style="font-size: 1.1rem; line-height: 1;">✅</span>
          <span>${item}</span>
        </li>
      `).join('');
    }
  } catch (err) {
    console.error('Error loading FSSAI guidelines:', err);
  }
}

// Interactive 4-Hour Food Safety & Eligibility Calculator
function calculateShelfLife() {
  const cookedVal = document.getElementById('calcCookedTime').value;
  const resultBox = document.getElementById('calcResultBox');

  if (!cookedVal) {
    showToast('Please specify the time when the food was cooked.', 'error');
    return;
  }

  const cookedTime = new Date(cookedVal).getTime();
  const now = Date.now();
  const diffHours = (now - cookedTime) / (3600 * 1000);

  resultBox.style.display = 'block';

  if (diffHours < 0) {
    resultBox.className = 'fssai-box';
    resultBox.style.background = '#fef2f2';
    resultBox.style.borderColor = '#fca5a5';
    resultBox.innerHTML = `
      <div style="color: #991b1b; font-weight: 800; font-size: 1.1rem; margin-bottom: 4px;">
        ⚠️ INVALID TIME: COOKED TIME CANNOT BE IN THE FUTURE
      </div>
      <p style="color: #7f1d1d; font-size: 0.9rem;">
        Please enter the actual time when the food was prepared.
      </p>
    `;
    return;
  }

  // Strict 4-Hour Rule: Food older than 4 hours is rejected
  if (diffHours > 4.0) {
    resultBox.className = 'fssai-box';
    resultBox.style.background = '#fef2f2';
    resultBox.style.borderColor = '#fca5a5';
    resultBox.innerHTML = `
      <div style="color: #991b1b; font-weight: 800; font-size: 1.15rem; margin-bottom: 4px;">
        ❌ DISALLOWED: FOOD COOKED MORE THAN 4 HOURS AGO
      </div>
      <p style="color: #7f1d1d; font-size: 0.92rem; line-height: 1.5;">
        This food was prepared <strong>${diffHours.toFixed(1)} hours ago</strong> (exceeds the 4-hour limit).<br>
        <strong>Policy Enforcement:</strong> Donors cannot post this food request and NGOs cannot accept it. Food exceeding 4 hours must not be redistributed to protect public health.
      </p>
    `;
  } else {
    const remainingMinutes = Math.floor((4.0 - diffHours) * 60);
    const hours = Math.floor(remainingMinutes / 60);
    const mins = remainingMinutes % 60;
    const isUrgent = remainingMinutes <= 90;
    const expireTime = cookedTime + (4.0 * 3600 * 1000);

    resultBox.className = 'fssai-box';
    resultBox.style.background = isUrgent ? '#fffbeb' : '#f0fdf4';
    resultBox.style.borderColor = isUrgent ? '#fde68a' : '#bbf7d0';

    resultBox.innerHTML = `
      <div style="color: ${isUrgent ? '#b45309' : '#166534'}; font-weight: 800; font-size: 1.15rem; margin-bottom: 6px;">
        ${isUrgent ? '⏱️ URGENT: SAFE WINDOW EXPIRING SOON' : '✅ ELIGIBLE & SAFE FOR REDISTRIBUTION'}
      </div>
      <div style="font-size: 1rem; color: #1e293b; margin-bottom: 8px;">
        Food Age: <strong>${diffHours.toFixed(1)} hours ago</strong> | Remaining Safe Window: <strong>${hours} hours ${mins} minutes</strong>
      </div>
      <div style="font-size: 0.88rem; color: #475569; line-height: 1.5;">
        <strong>Cutoff Expiration Time:</strong> ${new Date(expireTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.<br>
        This food batch can be posted by the donor and accepted by verified NGOs before this cutoff time.
      </div>
    `;
  }
}
