const crypto = require('crypto');

function base64UrlEncode(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

async function getAccessToken() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_B64, 'base64').toString('utf8');

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/calendar',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600
    };

    const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const jwt = `${unsigned}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        })
    });

    if (!res.ok) {
        throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return data.access_token;
}

// startISO/endISO must be full ISO 8601 datetimes (UTC, e.g. from a timestamptz column)
async function createCalendarEvent({ summary, description, startISO, endISO }) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const accessToken = await getAccessToken();

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            summary,
            description,
            start: { dateTime: startISO, timeZone: 'Asia/Bangkok' },
            end: { dateTime: endISO, timeZone: 'Asia/Bangkok' },
            reminders: {
                useDefault: false,
                overrides: [{ method: 'popup', minutes: 60 }]
            }
        })
    });

    if (!res.ok) {
        throw new Error(`Google Calendar event creation failed: ${res.status} ${await res.text()}`);
    }

    return res.json();
}

async function deleteCalendarEvent(eventId) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const accessToken = await getAccessToken();

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    // 410 = already deleted, treat as success
    if (!res.ok && res.status !== 404 && res.status !== 410) {
        throw new Error(`Google Calendar event deletion failed: ${res.status} ${await res.text()}`);
    }
}

module.exports = { createCalendarEvent, deleteCalendarEvent };
