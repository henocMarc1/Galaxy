import { auth, database } from './firebase-config.js';
import { ref, push, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

export async function logAction(action, entityType, entityId, details) {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const logRef = ref(database, 'audit-logs');
        await push(logRef, {
            timestamp: new Date().toISOString(),
            adminId: user.uid,
            adminEmail: user.email,
            action: action,
            entityType: entityType,
            entityId: entityId,
            details: details,
            createdAt: Date.now()
        });
    } catch (error) {
        console.error('Erreur audit:', error);
    }
}

export async function loadAuditLogs() {
    try {
        const logsRef = ref(database, 'audit-logs');
        const snapshot = await get(logsRef);
        let logs = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                logs.push({ id: child.key, ...child.val() });
            });
        }
        logs.sort((a, b) => b.createdAt - a.createdAt);
        displayAuditLogs(logs);
    } catch (error) {
        console.error('Erreur audit:', error);
    }
}

function displayAuditLogs(logs) {
    const container = document.getElementById('auditLogContainer');
    if (!container) return;
    if (logs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748B; padding: 2rem;">Aucun log</p>';
        return;
    }
    container.innerHTML = `<div class="audit-timeline">${logs.map(log => `
        <div class="audit-log-item">
            <div class="audit-log-dot ${log.action}"></div>
            <div class="audit-log-content ${log.action}">
                <div class="audit-log-header">
                    <span class="audit-log-action ${log.action}">${log.action === 'add' ? '✓ AJOUT' : log.action === 'edit' ? '✎ EDIT' : '✕ DEL'}</span>
                    <span class="audit-log-time">${new Date(log.timestamp).toLocaleString('fr-FR')}</span>
                </div>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;"><strong>${log.adminEmail}</strong> - ${log.entityType} ${log.entityId}</p>
            </div>
        </div>
    `).join('')}</div>`;
}

window.loadAuditLogs = loadAuditLogs;
