interface BookingEmailData {
  bookingNumber: string;
  offeringName: string;
  dateLabel: string;
  timeRangeLabel: string;
  timezone: string;
  customerName: string;
  meetingUrl?: string | null;
  topic?: string;
}

function layout(preheader: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
    <span style="display:none;font-size:1px;color:#f5f5f4;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;">
            <tr>
              <td style="background:#0c0a09;padding:24px 32px;">
                <span style="color:#fafaf9;font-size:15px;font-weight:600;letter-spacing:-0.01em;">CodeMentorly</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e7e5e4;">
                <p style="margin:0;font-size:12px;color:#78716c;">Booking reference — this email confirms details tied to your session.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailsTable(data: BookingEmailData): string {
  return `
    <table role="presentation" width="100%" style="margin-top:20px;background:#fafaf9;border-radius:8px;border:1px solid #e7e5e4;">
      <tr><td style="padding:16px 20px;font-size:14px;color:#57534e;width:110px;">Session</td><td style="padding:16px 20px 0 0;font-size:14px;font-weight:600;color:#1c1917;">${data.offeringName}</td></tr>
      <tr><td style="padding:0 20px 16px;font-size:14px;color:#57534e;">Date</td><td style="padding:0 20px 16px 0;font-size:14px;font-weight:600;color:#1c1917;">${data.dateLabel}</td></tr>
      <tr><td style="padding:0 20px 16px;font-size:14px;color:#57534e;">Time</td><td style="padding:0 20px 16px 0;font-size:14px;font-weight:600;color:#1c1917;">${data.timeRangeLabel} (${data.timezone})</td></tr>
      <tr><td style="padding:0 20px 16px;font-size:14px;color:#57534e;">Reference</td><td style="padding:0 20px 16px 0;font-size:14px;font-weight:600;color:#1c1917;">${data.bookingNumber}</td></tr>
    </table>`;
}

export function bookingConfirmationEmail(data: BookingEmailData): { subject: string; html: string } {
  const meeting = data.meetingUrl
    ? `<p style="margin:20px 0 0;font-size:14px;color:#57534e;">Meeting link: <a href="${data.meetingUrl}" style="color:#0c0a09;font-weight:600;">${data.meetingUrl}</a></p>`
    : `<p style="margin:20px 0 0;font-size:14px;color:#57534e;">Your meeting link will be sent shortly before the session.</p>`;

  return {
    subject: `You're booked — ${data.offeringName} on ${data.dateLabel}`,
    html: layout(
      `Your session is confirmed for ${data.dateLabel}`,
      `<h1 style="margin:0 0 8px;font-size:20px;">You're booked 🎉</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">Hi ${data.customerName}, your session is confirmed. Details below.</p>
       ${detailsTable(data)}
       ${meeting}
       <p style="margin:24px 0 0;font-size:13px;color:#78716c;">Please make sure you're in a quiet spot with a stable connection a few minutes before the session starts.</p>`,
    ),
  };
}

export function paymentConfirmationEmail(data: BookingEmailData & { amountLabel: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Payment received — ${data.amountLabel}`,
    html: layout(
      `Payment received for ${data.offeringName}`,
      `<h1 style="margin:0 0 8px;font-size:20px;">Payment received</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">Thanks ${data.customerName} — we've received your payment of <strong>${data.amountLabel}</strong> for your upcoming session.</p>
       ${detailsTable(data)}`,
    ),
  };
}

export function reminderEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Reminder: ${data.offeringName} starts soon`,
    html: layout(
      `Your session starts soon`,
      `<h1 style="margin:0 0 8px;font-size:20px;">See you soon</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">This is a reminder that your session is coming up.</p>
       ${detailsTable(data)}
       ${data.meetingUrl ? `<p style="margin:20px 0 0;font-size:14px;">Join here: <a href="${data.meetingUrl}" style="color:#0c0a09;font-weight:600;">${data.meetingUrl}</a></p>` : ""}`,
    ),
  };
}

export function cancellationEmail(data: BookingEmailData & { reason?: string }): { subject: string; html: string } {
  return {
    subject: `Cancelled — ${data.offeringName} on ${data.dateLabel}`,
    html: layout(
      `Your session has been cancelled`,
      `<h1 style="margin:0 0 8px;font-size:20px;">Session cancelled</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">Hi ${data.customerName}, the following session has been cancelled${data.reason ? `: ${data.reason}` : "."}</p>
       ${detailsTable(data)}
       <p style="margin:20px 0 0;font-size:13px;color:#78716c;">If a refund is due, it will be processed to your original payment method.</p>`,
    ),
  };
}

export function rescheduleEmail(data: BookingEmailData): { subject: string; html: string } {
  return {
    subject: `Rescheduled — ${data.offeringName}`,
    html: layout(
      `Your session has been rescheduled`,
      `<h1 style="margin:0 0 8px;font-size:20px;">Session rescheduled</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">Hi ${data.customerName}, your session has a new time.</p>
       ${detailsTable(data)}`,
    ),
  };
}

export function adminNewBookingEmail(data: BookingEmailData & { customerEmail: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `New booking — ${data.offeringName} (${data.dateLabel})`,
    html: layout(
      `New booking from ${data.customerName}`,
      `<h1 style="margin:0 0 8px;font-size:20px;">New booking</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">${data.customerName} (${data.customerEmail}) just booked a session.</p>
       ${detailsTable(data)}
       ${data.topic ? `<p style="margin:20px 0 0;font-size:14px;color:#57534e;"><strong>Topic:</strong> ${data.topic}</p>` : ""}`,
    ),
  };
}

export function adminCancellationEmail(data: BookingEmailData & { customerEmail: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Booking cancelled — ${data.offeringName} (${data.dateLabel})`,
    html: layout(
      `Booking cancelled by ${data.customerName}`,
      `<h1 style="margin:0 0 8px;font-size:20px;">Booking cancelled</h1>
       <p style="margin:0;font-size:14px;color:#57534e;">${data.customerName} (${data.customerEmail})'s booking was cancelled.</p>
       ${detailsTable(data)}`,
    ),
  };
}
