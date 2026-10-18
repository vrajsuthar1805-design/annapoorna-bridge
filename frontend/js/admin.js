// Annapoorna Bridge Platform Admin Controller

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getUser();
  if (!user || user.role !== 'admin') {
    showToast('Platform Admin privileges required to access Governance Center.', 'error');
    setTimeout(() => window.location.href = 'index.html', 1000);
    return;
  }

  await loadAdminOverview();
  await loadVerificationUsers();
  await loadAuditTrail();
});

// Load Overview Metrics
async function loadAdminOverview() {
  try {
    const res = await apiRequest('/metrics/impact');
    if (!res.success) return;

    const m = res.metrics;
    document.getElementById('admTotalKg').textContent = `${m.totalKgRescued} kg`;
    document.getElementById('admTotalMeals').textContent = m.mealsServed.toLocaleString('en-IN');
    document.getElementById('admTotalCo2').textContent = `${m.co2DivertedKg} kg (${m.co2DivertedTons} t)`;
    document.getElementById('admTotalWater').textContent = `${(m.waterSavedLiters / 1000).toFixed(1)} kL`;

    // Render City Table
    const cityTableBody = document.getElementById('cityStatsTableBody');
    if (cityTableBody && m.cityStats) {
      const rows = Object.keys(m.cityStats).map(cityName => {
        const s = m.cityStats[cityName];
        return `
          <tr>
            <td style="padding: 10px; font-weight: 600;">${cityName}</td>
            <td style="padding: 10px;">${s.listingsCount}</td>
            <td style="padding: 10px; color: #15803d; font-weight: 700;">${s.kgRescued} kg</td>
            <td style="padding: 10px;">${s.platesServed}</td>
          </tr>
        `;
      }).join('');
      cityTableBody.innerHTML = rows || '<tr><td colspan="4" style="text-align: center;">No city data yet</td></tr>';
    }
  } catch (err) {
    console.error('Error loading admin metrics:', err);
  }
}

// Load Users for Verification
async function loadVerificationUsers() {
  try {
    const res = await apiRequest('/admin/users');
    if (!res.success) return;

    const tbody = document.getElementById('verificationTableBody');
    if (!tbody) return;

    tbody.innerHTML = res.users.map(u => {
      let regIdentifier = '—';
      if (u.role === 'donor' && u.donorDetails) regIdentifier = u.donorDetails.licenseNumber || 'License N/A';
      if (u.role === 'ngo' && u.ngoDetails) regIdentifier = u.ngoDetails.darpanId ? `Darpan: ${u.ngoDetails.darpanId}` : 'Darpan N/A';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 600;">
            ${u.name}
            <div style="font-size: 0.75rem; color: #64748b;">${u.email}</div>
          </td>
          <td style="padding: 12px;">
            <span class="role-badge role-${u.role}">${u.role.toUpperCase()}</span>
          </td>
          <td style="padding: 12px; font-size: 0.85rem;">${u.city}</td>
          <td style="padding: 12px; font-size: 0.85rem; font-family: monospace;">${regIdentifier}</td>
          <td style="padding: 12px;">
            ${u.isVerified
              ? '<span style="color: #15803d; font-weight: 700; font-size: 0.85rem;">✅ Verified</span>'
              : '<span style="color: #d97706; font-weight: 700; font-size: 0.85rem;">⏳ Pending</span>'
            }
          </td>
          <td style="padding: 12px; text-align: right;">
            <button class="btn btn-sm ${u.isVerified ? 'btn-outline' : 'btn-primary'}" onclick="toggleVerifyUser('${u._id}', ${!u.isVerified})">
              ${u.isVerified ? 'Unverify' : 'Verify Organization ✓'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    showToast('Failed to load users: ' + err.message, 'error');
  }
}

// Toggle Verification
async function toggleVerifyUser(userId, newStatus) {
  try {
    const res = await apiRequest(`/admin/users/${userId}/verify`, 'PUT', { isVerified: newStatus });
    if (res.success) {
      showToast(res.message, 'success');
      await loadVerificationUsers();
      await loadAdminOverview();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Load Audit Trail Logs
async function loadAuditTrail() {
  try {
    const res = await apiRequest('/admin/logs');
    if (!res.success) return;

    const list = document.getElementById('auditTrailList');
    if (!list) return;

    list.innerHTML = res.logs.map(log => `
      <div style="padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;">
        <div>
          <span style="font-weight: 700; color: #1e3a8a; background: #eff6ff; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">
            ${log.action}
          </span>
          <span style="font-weight: 600; margin-left: 8px;">${log.actorName}</span> (${log.actorRole})
          <div style="color: #64748b; font-size: 0.8rem; margin-top: 2px;">${log.note || ''}</div>
        </div>
        <div style="color: #94a3b8; font-size: 0.75rem;">
          ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading audit logs:', err);
  }
}
