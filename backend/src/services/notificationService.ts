import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

export async function enqueueNotification(db: PrismaClient, eventCode: string, payload: Record<string, unknown>) {
  const rule = await db.notificationRule.findUnique({ where: { eventCode } });
  if (rule && !rule.isActive) return;
  await db.notificationQueue.create({
    data: { eventCode, payload: payload as object },
  });
}

function substitute(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

/** Process pending queue rows (SMTP optional via env). Confidential: omit title in subject/body when payload.confidential */
export async function processNotificationQueue(db: PrismaClient, limit = 25): Promise<number> {
  const pending = await db.notificationQueue.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  let done = 0;
  for (const row of pending) {
    const payload = (row.payload || {}) as Record<string, string | boolean | number | null | undefined>;
    const confidential = Boolean(payload.confidential);
    const reportNo = confidential ? '[Gizli case]' : String(payload.reportNo ?? '');
    const title = confidential ? '' : String(payload.title ?? '');
    const vars: Record<string, string> = {
      report_no: reportNo,
      case_type: String(payload.caseType ?? ''),
      title,
      department: String(payload.department ?? ''),
      location: String(payload.location ?? ''),
      risk_level: String(payload.riskLevel ?? ''),
      mitigation_no: String(payload.mitigationNo ?? ''),
      target_date: String(payload.targetDate ?? ''),
      current_status: String(payload.currentStatus ?? ''),
      action_required: String(payload.actionRequired ?? ''),
      direct_link: String(payload.directLink ?? ''),
    };

    let subject = `[SMS] ${row.eventCode} ${reportNo}`.trim();
    let body = JSON.stringify(payload, null, 2);

    const tmpl = await db.notificationTemplate.findUnique({
      where: { templateKey: row.eventCode },
    });
    if (tmpl) {
      subject = substitute(tmpl.subjectTemplate, vars);
      body = substitute(tmpl.bodyTemplate, vars);
    }

    const smtpUrl = process.env.SMTP_URL;
    if (smtpUrl) {
      try {
        const transporter = nodemailer.createTransport(smtpUrl);
        const to = process.env.NOTIFY_FALLBACK_EMAIL || 'admin@sms.local';
        await transporter.sendMail({
          from: process.env.MAIL_FROM || 'sms@localhost',
          to,
          subject: confidential ? `[SMS] ${row.eventCode} (gizli)` : subject,
          text: confidential ? 'Gizli kayıt — ayrıntı e-postada gösterilmez.' : body,
        });
      } catch (e) {
        console.error('SMTP send failed', e);
        await db.notificationLog.create({
          data: {
            eventCode: row.eventCode,
            recipient: process.env.NOTIFY_FALLBACK_EMAIL || 'smtp-failed',
            subject: `[FAILED] ${subject}`.slice(0, 200),
            bodyPreview: `SMTP error: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500),
            caseId: typeof payload.reportId === 'number' ? payload.reportId : null,
          },
        });
        await db.notificationQueue.update({
          where: { id: row.id },
          data: { status: 'FAILED', processedAt: new Date() },
        });
        continue;
      }
    }

    await db.notificationLog.create({
      data: {
        eventCode: row.eventCode,
        recipient: smtpUrl ? process.env.NOTIFY_FALLBACK_EMAIL : 'log-only',
        subject: confidential ? `[gizli] ${row.eventCode}` : subject.slice(0, 200),
        bodyPreview: body.slice(0, 500),
        caseId: typeof payload.reportId === 'number' ? payload.reportId : null,
      },
    });

    await db.notificationQueue.update({
      where: { id: row.id },
      data: { status: 'SENT', processedAt: new Date() },
    });
    done += 1;
  }
  return done;
}
