// src/services/emailService.ts
export type EmailAddress = string | string[];

export interface EmailConfig {
  recipientEmail: string;
  ccEmails?: string;             // séparées par virgules
  subject: string;               // peut contenir [DATE]
  autoSendEnabled?: boolean;
  autoSendTime?: string;         // "HH:mm"
  performRAZ?: boolean;
  attachPDF?: boolean;
  attachData?: boolean;
  includeDetails?: boolean;
  isManual?: boolean;
}

export interface EmailStatus {
  scheduled: boolean;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

function parseCC(cc?: string): string[] {
  return (cc ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s);
}

export const EmailService = {
  validateEmailConfig(config: EmailConfig): string[] {
    const errors: string[] = [];
    if (!config.recipientEmail || !isValidEmail(config.recipientEmail)) {
      errors.push('Email destinataire invalide');
    }
    if (config.ccEmails) {
      const invalid = parseCC(config.ccEmails).filter(e => !isValidEmail(e));
      if (invalid.length) errors.push(`Emails en copie invalides: ${invalid.join(', ')}`);
    }
    if (!config.subject?.length) errors.push('Sujet requis');
    if (config.autoSendEnabled && !config.autoSendTime) errors.push('Heure envoi quotidienne requise');
    return errors;
  },

  async getEmailStatus(): Promise<EmailStatus> {
    // Tu pourras le brancher sur n8n plus tard
    return { scheduled: false };
  },

  async sendDailyReport(reportData: unknown, config: EmailConfig): Promise<SendResult> {
    try {
      const errs = this.validateEmailConfig(config);
      if (errs.length) return { ok: false, error: errs.join(', ') };

      const payload = {
        to: config.recipientEmail,
        cc: parseCC(config.ccEmails),
        subject: config.subject,
        body: reportData,
        options: {
          attachPDF: config.attachPDF,
          attachData: config.attachData,
        },
      };

      const webhookUrl = import.meta.env.VITE_N8N_EMAIL_WEBHOOK || 'https://n8n.myconfort.fr/webhook/email-rapport';
      if (!webhookUrl) {
        throw new Error('Webhook n8n non configuré (VITE_N8N_EMAIL_WEBHOOK)');
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }

      const json = await res.json().catch(() => ({}));
      return { ok: true, id: json.id ?? `mail_${Date.now()}` };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return { ok: false, error: message };
    }
  },

  async testEmailConfiguration(config: EmailConfig): Promise<SendResult> {
    return this.sendDailyReport({ test: true }, { ...config, subject: '[TEST] ' + config.subject });
  },

  async scheduleAutomaticEmail(config: EmailConfig): Promise<SendResult> {
    try {
      const errs = this.validateEmailConfig({ ...config, autoSendEnabled: true });
      if (errs.length) return { ok: false, error: errs.join(', ') };
      // TODO: gérer un cron n8n
      return { ok: true, id: `schedule_${Date.now()}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return { ok: false, error: message };
    }
  },

  generateEmailPreview(data: unknown): string {
    const dataObj = data as {
      totalSales?: number;
      salesCount?: number;
      vendors?: Array<{ name: string; sales?: number; totalSales?: number }>;
    };
    const total = dataObj?.totalSales ?? 0;
    const count = dataObj?.salesCount ?? 0;
    const vendors = dataObj?.vendors ?? [];
    const rows = vendors
      .map(v => `<tr><td>${v.name}</td><td style="text-align:right">${(v.sales ?? 0).toFixed(2)}</td><td style="text-align:right">${(v.totalSales ?? 0).toFixed(2)}</td></tr>`)
      .join('');
    return `
      <!doctype html><html><head><meta charset="utf-8" />
      <title>Preview Rapport</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #e5e7eb;padding:8px}
        th{background:#f3f4f6;text-align:left}
      </style></head><body>
      <h2>Rapport de Caisse (prévisualisation)</h2>
      <p><b>CA du jour:</b> ${total.toFixed(2)} € — <b>Ventes:</b> ${count}</p>
      <table>
        <thead><tr><th>Vendeur(se)</th><th>Ventes jour</th><th>Total cumulé</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>`;
  },

  async performRAZ(): Promise<SendResult> {
    try {
      const webhookUrl = import.meta.env.VITE_N8N_RAZ_WEBHOOK || 'https://n8n.myconfort.fr/webhook/raz-journee';
      if (!webhookUrl) {
        console.warn('Webhook RAZ non configuré, fallback console.log');
        console.log('🔄 RAZ demandée (simulée)');
        return { ok: true, id: `raz_${Date.now()}` };
      }

      const res = await fetch(webhookUrl, { method: 'POST' });
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const json = await res.json().catch(() => ({}));
      return { ok: true, id: json.id ?? `raz_${Date.now()}` };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return { ok: false, error: message };
    }
  },
};
