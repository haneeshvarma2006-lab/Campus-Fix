import { registerCheck } from './health.js'

/**
 * Transactional email.
 *
 * Sent over Resend's HTTP API rather than SMTP, because a serverless function
 * gets a few hundred milliseconds and a cold TCP connection is a poor way to
 * spend them. That also means no new dependency: this is one fetch call.
 *
 * Email is optional. With no key configured the app runs exactly as before and
 * says so on /api/health, the same way Google sign-in and photo storage do.
 */

const API_KEY = process.env.RESEND_API_KEY || ''
const FROM = process.env.MAIL_FROM || ''
const APP_URL = process.env.APP_URL || ''

export const isConfigured = Boolean(API_KEY && FROM)

registerCheck(() => {
  if (API_KEY && !FROM) return 'RESEND_API_KEY is set but MAIL_FROM is missing, so no email can be sent.'
  return null
})

/**
 * Sends one message. Never throws and never rejects: a notification that fails
 * must not fail the request that triggered it. Returns true only when Resend
 * accepted the message.
 */
export async function sendMail({ to, subject, text }) {
  if (!isConfigured || !to) return false

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error(`Email to ${to} was rejected: ${res.status} ${await res.text()}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`Could not send email to ${to}:`, err.message)
    return false
  }
}

const HEADLINE = {
  assigned: 'Someone has picked up your report',
  in_progress: 'Work has started on your report',
  fixed: 'Your report has been fixed',
  rejected: 'Your report was closed without a fix',
  reported: 'Your report is back in the queue',
}

/**
 * Tells a reporter their report moved. This is the whole point of the app from
 * a student's side — they reported something and want to know it went
 * somewhere — so the message leads with the outcome and carries the note the
 * admin wrote, which is usually the part that actually answers their question.
 */
export function statusChangeEmail({ report, status, note }) {
  const headline = HEADLINE[status] || 'Your report was updated'
  const link = APP_URL ? `\n\nSee it here: ${APP_URL.replace(/\/$/, '')}/reports/${report.id}` : ''

  return {
    subject: `${headline} — #${report.code}`,
    text: [
      headline + '.',
      '',
      `"${report.title}"`,
      `${report.category} · ${report.location} · reference #${report.code}`,
      note ? `\nNote from the team:\n${note}` : '',
      link,
      '',
      '— CampusFix',
    ].filter((line) => line !== null).join('\n'),
  }
}
