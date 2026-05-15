import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

interface NotifyParams {
  actorId: string
  actorEmail: string
  raceName: string
  raceId: string
  raceSlug: string
  raceDate: string
  raceLocation: string
}

export async function notifyFollowers({
  actorId,
  actorEmail,
  raceName,
  raceId,
  raceSlug,
  raceDate,
  raceLocation,
}: NotifyParams) {
  const actorName = actorEmail.split('@')[0]

  const { data: follows } = await admin
    .from('follows')
    .select('follower_id')
    .eq('following_id', actorId)

  if (!follows?.length) return

  const dateFormatted = new Date(raceDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const raceUrl = `https://racefinder.sanjiv-shah.com/race/${raceSlug}`

  const payload = {
    type: 'friend_going',
    actor_name: actorName,
    race_name: raceName,
    race_id: raceId,
    race_slug: raceSlug,
  }

  for (const { follower_id } of follows) {
    const { data: prefs } = await admin
      .from('user_preferences')
      .select('email_friend_going, in_app_notifications')
      .eq('user_id', follower_id)
      .maybeSingle()

    const inAppEnabled = prefs?.in_app_notifications ?? true
    const emailEnabled = prefs?.email_friend_going ?? true

    if (inAppEnabled) {
      await admin.from('notifications').insert({
        user_id: follower_id,
        type: 'friend_going',
        payload,
      })
    }

    if (emailEnabled) {
      const { data: followerAuth } = await admin.auth.admin.getUserById(follower_id)
      const followerEmail = followerAuth.user?.email
      if (!followerEmail) continue

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
          to: followerEmail,
          subject: `${actorName} is doing ${raceName} — want to join?`,
          html: buildEmail({ actorName, raceName, dateFormatted, raceLocation, raceUrl }),
        })
      } catch (e) {
        console.error('Friend notification email failed:', e)
      }
    }
  }
}

function buildEmail({
  actorName,
  raceName,
  dateFormatted,
  raceLocation,
  raceUrl,
}: {
  actorName: string
  raceName: string
  dateFormatted: string
  raceLocation: string
  raceUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="height:6px;background:#FF4500;"></div>
    <div style="padding:32px 28px 24px;">
      <p style="margin:0 0 4px;color:#64748B;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your friend is racing</p>
      <h1 style="margin:0 0 24px;color:#0F172A;font-size:26px;line-height:1.2;font-weight:800;">${actorName} is doing ${raceName}</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="padding:10px 0;color:#64748B;font-size:13px;width:90px;border-bottom:1px solid #F1F5F9;">Date</td>
          <td style="padding:10px 0;color:#0F172A;font-size:14px;font-weight:600;border-bottom:1px solid #F1F5F9;">${dateFormatted}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748B;font-size:13px;">Location</td>
          <td style="padding:10px 0;color:#0F172A;font-size:14px;">${raceLocation}</td>
        </tr>
      </table>
      <a href="${raceUrl}" style="display:inline-block;background:#FF4500;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
        Join them →
      </a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E2E8F0;">
      <p style="margin:0;color:#94A3B8;font-size:12px;">
        You're receiving this because someone you follow on RaceFinder signed up for a race.
        <a href="https://racefinder.sanjiv-shah.com/account" style="color:#FF4500;text-decoration:none;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
