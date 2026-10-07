// ==========================================================
// ANNAPOORNA BRIDGE - Admin Governance & Audit Trail
// ==========================================================

async function loadAdminData() {
  const user = getUser();
  if (!user || user.role !== 'admin') {
    showToast('Administrator privileges required.', 'error');
    switchTab('feed');
    return;
  }
  await Promise.all([loadAdminUsers(), loadAdminAuditLogs()]);
}

async function loadAdminUsers() {
  const token = getToken();
  const filter = document.getElementById('adminUserFilter').value;
  const tbody = document.getElementById('adminUsersTable');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-slate-400">Loading partners...</td></tr>';

  try {
    const url = filter === 'all' ? `${API_BASE}/admin/users` : `${API_BASE}/admin/users?isVerified=${filter}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch users');

    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-slate-400">No partner records found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = data.users.map((u) => {
      const isVerified = u.isVerified;
      const roleColor = u.role === 'admin' ? 'bg-purple-100 text-purple-800' : u.role === 'ngo' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800';

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-4 py-3">
            <div class="font-bold text-slate-900">${u.orgName || u.name}</div>
            <div class="text-[11px] text-slate-500">${u.name} • ${u.email} • 📞 ${u.phone}</div>
          </td>
          <td class="px-4 py-3">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${roleColor}">
              ${u.role}
            </span>
          </td>
          <td class="px-4 py-3 font-medium text-slate-700">
            ${u.city}
          </td>
          <td class="px-4 py-3">
            <code class="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-800">
              ${u.licenseOrDarpanId || 'N/A'}
            </code>
          </td>
          <td class="px-4 py-3">
            ${isVerified
              ? '<span class="inline-flex items-center gap-1 text-emerald-700 font-bold"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Verified</span>'
              : '<span class="inline-flex items-center gap-1 text-amber-600 font-bold"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Pending Review</span>'}
          </td>
          <td class="px-4 py-3 text-right">
            ${u.role !== 'admin'
              ? (isVerified
                ? `<button onclick="toggleVerification('${u._id}', false)" class="px-2.5 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition">Revoke</button>`
                : `<button onclick="toggleVerification('${u._id}', true)" class="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm transition">Verify Partner</button>`)
              : '<span class="text-slate-400 text-xs">Super Admin</span>'}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-red-500">${err.message}</td></tr>`;
  }
}

async function toggleVerification(userId, isVerified) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        isVerified,
        verificationNotes: isVerified ? 'Verified by System Administrator' : 'Revoked by Administrator',
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Action failed');

    showToast(data.message, 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAdminAuditLogs() {
  const token = getToken();
  const tbody = document.getElementById('adminAuditTable');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">Loading audit trail...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch audit logs');

    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400">No transaction logs recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map((log) => {
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : log.details;

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-4 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
            ${new Date(log.createdAt).toLocaleString()}
          </td>
          <td class="px-4 py-2.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
              ${log.action}
            </span>
          </td>
          <td class="px-4 py-2.5">
            <div class="font-semibold text-slate-800">${log.userName || (log.userId ? log.userId.name : 'System')}</div>
            <div class="text-[10px] text-slate-500 uppercase">${log.userRole || 'USER'}</div>
          </td>
          <td class="px-4 py-2.5 text-[11px] text-slate-600 font-mono max-w-xs truncate" title="${detailsStr}">
            ${detailsStr}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-red-500">${err.message}</td></tr>`;
  }
}
