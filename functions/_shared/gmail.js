// functions/_shared/gmail.js
// Shared Gmail API helpers — imported by functions that need to send email

const FROM_EMAIL = 'noreply@virtuallaunch.pro';
const FROM_NAME  = 'Virtual Launch Pro';

export { FROM_EMAIL, FROM_NAME };

export async function sendEmail(env, toEmail, subject, bodyText, html) {
  const privateKey  = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const clientEmail = env.GOOGLE_CLIENT_EMAIL;
  const accessToken = await getGoogleAccessToken(clientEmail, privateKey);
  const raw = html
    ? buildRawEmailHtml(FROM_EMAIL, FROM_NAME, toEmail, subject, html, bodyText)
    : buildRawEmail(FROM_EMAIL, FROM_NAME, toEmail, subject, bodyText);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${err}`);
  }
}

export function buildRawEmail(fromEmail, fromName, toEmail, subject, bodyText) {
  const message = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    bodyText
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * buildRawEmailHtml — multipart/alternative with text/plain fallback + text/html part.
 * If text is omitted the plain fallback is empty.
 */
export function buildRawEmailHtml(fromEmail, fromName, toEmail, subject, htmlBody, textFallback) {
  const boundary = `vlp_boundary_${Date.now()}`;
  const plain    = textFallback || '';

  const message = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    plain,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    htmlBody,
    ``,
    `--${boundary}--`
  ].join('\r\n');

  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function getGoogleAccessToken(clientEmail, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   clientEmail,
    scope: 'https://www.googleapis.com/auth/gmail.send',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now
  };

  const jwt = await signJwt(claim, privateKeyPem);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer',
      assertion:  jwt
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function signJwt(payload, pemKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const encode = obj => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const keyData   = pemToBinary(pemKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${signingInput}.${sigB64}`;
}

export function pemToBinary(pem) {
  const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
