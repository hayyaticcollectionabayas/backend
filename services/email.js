import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Lazy initialization — transporter and resend client are created on first use so env vars are available
let _transporter = null;
let _resend = null;

const getResend = () => {
  if (_resend) return _resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    _resend = new Resend(apiKey);
  }
  return _resend;
};

const getTransporter = () => {
  if (_transporter) return _transporter;
  const smtpUser = process.env.SMTP_USER || process.env.admin || 'hayyaticcollectionabayas@gmail.com';
  const smtpPassword = (process.env.SMTP_APP_PASSWORD || process.env.password || '').replace(/\s/g, '');
  if (!smtpUser || !smtpPassword) {
    console.warn('[Email Warning] Missing SMTP credentials. Check .env for SMTP_USER & SMTP_APP_PASSWORD');
    return null;
  }
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: smtpUser, pass: smtpPassword },
    tls: { rejectUnauthorized: false },
  });
  return _transporter;
};

const getAdminEmail = () => process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'hayyaticcollectionabayas@gmail.com';
const getSmtpUser = () => process.env.SMTP_USER || 'hayyaticcollectionabayas@gmail.com';

// ─── HTML TEMPLATES ──────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hayyatic Collection</title>
</head>
<body style="margin:0;padding:0;background-color:#faf7f2;font-family:Arial,Helvetica,sans-serif;color:#2c221e;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf7f2;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e8e2d8;border-radius:12px;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:#1b120c;padding:32px 24px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;color:#d4af37;text-transform:uppercase;font-weight:bold;">Exclusive Modest Wear</p>
              <h1 style="margin:0;font-size:26px;font-weight:normal;color:#ffffff;letter-spacing:1px;font-family:Georgia,serif;">Hayyatic Collection</h1>
            </td>
          </tr>

          <!-- ACCENT LINE -->
          <tr>
            <td style="background:#d4af37;height:3px;"></td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:32px 28px;background:#ffffff;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f4efe9;border-top:1px solid #e8e2d8;padding:20px 24px;text-align:center;font-size:12px;color:#7a6b61;line-height:1.6;">
              <p style="margin:0 0 4px;font-weight:bold;color:#2c221e;">Hayyatic Collection</p>
              <p style="margin:0;">Handcrafted Elegance & Modest Fashion</p>
              <p style="margin:8px 0 0;font-size:11px;color:#9e8e82;">
                This is an automated order confirmation from Hayyatic Collection.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const statusBadge = (status) => {
  const map = {
    CONFIRMED: { bg: '#e8f5e9', color: '#2e7d32', text: 'Confirmed' },
    PENDING: { bg: '#fff8e1', color: '#f57f17', text: 'Pending' },
    PENDING_PAYMENT: { bg: '#fff8e1', color: '#f57f17', text: 'Awaiting Payment' },
    PROCESSING: { bg: '#e3f2fd', color: '#1565c0', text: 'Processing' },
    SHIPPED: { bg: '#e0f7fa', color: '#00838f', text: 'Shipped' },
    DELIVERED: { bg: '#e8f5e9', color: '#2e7d32', text: 'Delivered' },
    CANCELLED_BY_USER: { bg: '#ffebee', color: '#c62828', text: 'Cancelled' },
    CANCELLED_BY_ADMIN: { bg: '#ffebee', color: '#c62828', text: 'Cancelled' },
  };
  const s = map[status] || { bg: '#f5f5f5', color: '#616161', text: status };
  return `<span style="display:inline-block;background:${s.bg};color:${s.color};padding:5px 14px;border-radius:16px;font-size:12px;font-weight:bold;letter-spacing:0.5px;">${s.text}</span>`;
};

const orderItemsTable = (items) => {
  if (!items?.length) return '';
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#2c221e;">
        <strong>${item.name || 'Abaya'}</strong>
        ${item.size ? `<span style="color:#7a6b61;font-size:12px;"> · Size: ${item.size}</span>` : ''}
        ${item.color ? `<span style="color:#7a6b61;font-size:12px;"> · Color: ${item.color}</span>` : ''}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:#555;">${item.qty}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:bold;color:#2c221e;">Rs. ${(item.price * item.qty).toLocaleString()}</td>
    </tr>
  `).join('');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
      <thead>
        <tr style="border-bottom:2px solid #e8e2d8;">
          <th style="padding:8px;text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;">Item</th>
          <th style="padding:8px;text-align:center;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;">Qty</th>
          <th style="padding:8px;text-align:right;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

// ─── CUSTOMER ORDER CONFIRMATION ──────────────────────────────────────────────
const customerOrderHtml = (order) => {
  const address = order.shippingAddress || {};
  return baseTemplate(`
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Order Confirmation</p>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:normal;color:#1b120c;font-family:Georgia,serif;">Thank you for your order</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
      We have received your order and are currently preparing it. We will notify you once it has been dispatched.
    </p>

    <!-- ORDER SUMMARY CARD -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border:1px solid #eee;border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0 0 2px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;">Order Number</p>
                <p style="margin:0;font-size:18px;font-weight:bold;color:#1b120c;font-family:Georgia,serif;">${order.orderNumber}</p>
              </td>
              <td style="text-align:right;">
                ${statusBadge(order.status)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- ORDER ITEMS -->
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Order Summary</p>
    ${orderItemsTable(order.items)}

    <!-- TOTAL -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#1b120c;border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#d4af37;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Total Amount</td>
              <td style="text-align:right;font-size:20px;font-weight:bold;color:#ffffff;font-family:Georgia,serif;">Rs. ${order.total?.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:4px;font-size:12px;color:#c2b1a3;">
                Payment Method: ${order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- DELIVERY ADDRESS -->
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Shipping Address</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;margin-bottom:20px;background:#faf7f2;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:#333;line-height:1.7;">
          <strong>${address.name || ''}</strong><br/>
          ${address.phone ? `Phone: ${address.phone}<br/>` : ''}
          ${address.street || ''}, ${address.city || ''}
          ${address.postalCode ? ` - ${address.postalCode}` : ''}
        </td>
      </tr>
    </table>

    <!-- TRACK ORDER BANNER -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;text-align:center;">
      <tr>
        <td style="padding:14px 16px;background:#faf7f2;border:1px solid #d4af37;border-radius:8px;">
          <p style="margin:0 0 4px;font-size:12px;color:#8b6914;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Live Order Tracking</p>
          <p style="margin:0;font-size:12px;color:#555;line-height:1.5;">
            Track your order progress anytime using Order ID: <strong>${order.orderNumber}</strong>
          </p>
        </td>
      </tr>
    </table>
  `);
};

// ─── ADMIN NEW ORDER NOTIFICATION ─────────────────────────────────────────────
const adminOrderHtml = (order, customerEmail) => {
  const address = order.shippingAddress || {};
  return baseTemplate(`
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Admin Notification</p>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:normal;color:#1b120c;font-family:Georgia,serif;">New Order Received</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
      A new customer order has been placed on the store.
    </p>

    <!-- ORDER SUMMARY CARD -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border:1px solid #eee;border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0 0 2px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;">Order Number</p>
                <p style="margin:0;font-size:18px;font-weight:bold;color:#1b120c;font-family:Georgia,serif;">${order.orderNumber}</p>
              </td>
              <td style="text-align:right;">
                ${statusBadge(order.status)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CUSTOMER DETAILS -->
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Customer Details</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;margin-bottom:20px;background:#faf7f2;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;color:#333;line-height:1.7;">
          <strong>Name:</strong> ${address.name || 'N/A'}<br/>
          <strong>Email:</strong> ${customerEmail || 'N/A'}<br/>
          <strong>Phone:</strong> ${address.phone || 'N/A'}<br/>
          <strong>Address:</strong> ${address.street || ''}, ${address.city || ''} ${address.postalCode || ''}
        </td>
      </tr>
    </table>

    <!-- ORDER ITEMS -->
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Ordered Items</p>
    ${orderItemsTable(order.items)}

    <!-- TOTAL -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#1b120c;border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#d4af37;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Total Amount</td>
              <td style="text-align:right;font-size:20px;font-weight:bold;color:#ffffff;font-family:Georgia,serif;">Rs. ${order.total?.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:4px;font-size:12px;color:#c2b1a3;">
                Payment Method: ${order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `);
};

// ─── ORDER STATUS UPDATE ───────────────────────────────────────────────────────
const orderStatusHtml = (order, reason) => {
  return baseTemplate(`
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8b6914;font-weight:bold;">Order Update</p>
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:normal;color:#1b120c;font-family:Georgia,serif;">Order Status Update</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.6;">
      Your order status has been updated.
    </p>

    <!-- ORDER SUMMARY CARD -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;border:1px solid #eee;border-radius:8px;margin-bottom:20px;">
      <tr>
        <td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="margin:0 0 2px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#888;">Order Number</p>
                <p style="margin:0;font-size:18px;font-weight:bold;color:#1b120c;font-family:Georgia,serif;">${order.orderNumber}</p>
              </td>
              <td style="text-align:right;">
                ${statusBadge(order.status)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- STATUS DETAIL -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;background:#1b120c;border-radius:8px;">
      <tr>
        <td style="padding:20px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;color:#d4af37;text-transform:uppercase;letter-spacing:1.5px;">Current Status</p>
          <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;font-family:Georgia,serif;">${order.status?.replace(/_/g, ' ')}</p>
          ${reason ? `<p style="margin:10px 0 0;font-size:13px;color:#c2b1a3;">Note: ${reason}</p>` : ''}
        </td>
      </tr>
    </table>
  `);
};

// ─── SEND HELPER ─────────────────────────────────────────────────────────────

const send = async ({ to, subject, html, text }) => {
  if (!to) {
    console.warn('[Email Warning] Cannot send email — Missing recipient');
    return false;
  }

  // 1. Try Resend if API key is present
  const resend = getResend();
  if (resend) {
    try {
      const from = process.env.RESEND_FROM || 'Hayyatic Collection <onboarding@resend.dev>';
      const { data, error } = await resend.emails.send({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      });

      if (!error && data?.id) {
        console.log(`[Resend Email Sent ✅] To: ${to} | Subject: "${subject}" | MessageId: ${data.id}`);
        return true;
      }

      console.warn(`[Resend Warning ⚠️] Could not deliver to ${to} (${error?.message || JSON.stringify(error)}). Trying Nodemailer fallback...`);
    } catch (resendErr) {
      console.warn(`[Resend Exception ⚠️] ${resendErr.message}. Trying Nodemailer fallback...`);
    }
  }

  // 2. Fallback to Nodemailer (Gmail SMTP)
  const transporter = getTransporter();
  const smtpUser = getSmtpUser();
  if (!transporter) {
    console.warn('[Email Warning] Cannot send email — Transporter initialization failed');
    return false;
  }
  if (!smtpUser) {
    console.warn('[Email Warning] Cannot send email — Missing sender:', { to, smtpUser });
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from: `"Hayyatic Collection" <${smtpUser}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`[SMTP Email Sent ✅] To: ${to} | Subject: "${subject}" | MessageId: ${info?.messageId}`);
    return true;
  } catch (err) {
    console.error(`[Email Error ❌] Failed sending to ${to}:`, err.message);
    return false;
  }
};

// ─── EXPORTED FUNCTIONS ───────────────────────────────────────────────────────

export const sendNewOrderEmails = async (order, customerEmail) => {
  await Promise.allSettled([
    send({
      to: customerEmail,
      subject: `Order Receipt #${order.orderNumber} - Hayyatic Collection`,
      html: customerOrderHtml(order),
      text: `Dear Customer,\n\nThank you for your order with Hayyatic Collection.\n\nOrder Number: ${order.orderNumber}\nTotal: Rs. ${order.total?.toLocaleString()}\nStatus: ${order.status}\n\nWe are preparing your items and will update you when dispatched.\n\nRegards,\nHayyatic Collection`,
    }),
    send({
      to: getAdminEmail(),
      subject: `Store Alert: New Order #${order.orderNumber} (Rs. ${order.total?.toLocaleString()})`,
      html: adminOrderHtml(order, customerEmail),
      text: `Store Alert - New Order\n\nOrder Number: ${order.orderNumber}\nCustomer: ${customerEmail}\nTotal: Rs. ${order.total?.toLocaleString()}\nPayment: ${order.paymentMethod}\nStatus: ${order.status}`,
    }),
  ]);
};

export const sendOrderStatusEmails = async (order, customerEmail, reason = '') => {
  const cleanStatus = (order.status || '').replace(/_/g, ' ');
  await Promise.allSettled([
    send({
      to: customerEmail,
      subject: `Order Update #${order.orderNumber}: ${cleanStatus}`,
      html: orderStatusHtml(order, reason),
      text: `Your Hayyatic Collection order #${order.orderNumber} is now: ${cleanStatus}${reason ? '\nNote: ' + reason : ''}`,
    }),
    send({
      to: getAdminEmail(),
      subject: `Admin Log: Order #${order.orderNumber} marked as ${cleanStatus}`,
      html: orderStatusHtml(order, reason),
      text: `Order #${order.orderNumber} status changed to ${cleanStatus}${reason ? '\nNote: ' + reason : ''}`,
    }),
  ]);
};
