// app/api/family/invite/route.ts — migrated from server/family/invite.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendError, parseJson } from '@/lib/api-utils/http';
import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { email } = await parseJson(req, z.object({ email: z.string().email() }));
    const supabase = await createServerSupabase();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Please sign in to invite family members.' }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('family_id, role, families(name)')
      .eq('user_id', user.id).eq('role', 'owner').eq('is_active', true).single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Only the family owner can invite new members.' }, { status: 403 });
    }

    const familyName = (membership as any).families?.name ?? 'Our Family';

    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = 'UL-';
      for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return result;
    };
    const code = generateCode();

    const { data: invitation, error: inviteError } = await supabase
      .rpc('create_family_invitation', { invite_email: email, invite_code: code });
    if (inviteError) throw inviteError;

    let emailSent = false;
    let smtpError = '';

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost, port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? `"UnBoxed Learning" <${smtpUser}>`,
          to: email,
          subject: `You've been invited to join ${familyName} on UnBoxed Learning!`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;border:1px solid #e2e8f0;border-radius:16px;">
              <h1 style="color:#1e1b4b;text-align:center;">You're Invited! 🎓</h1>
              <p style="color:#475569;">You have been invited to join <strong>${familyName}</strong> on UnBoxed Learning.</p>
              <div style="text-align:center;margin:32px 0;padding:24px;background:#f8fafc;border-radius:16px;border:1px dashed #cbd5e1;">
                <p style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;margin:0 0 8px 0;">Your Joining Code</p>
                <div style="font-family:monospace;font-size:36px;font-weight:800;color:#4c1d95;letter-spacing:0.15em;">${code}</div>
                <p style="color:#94a3b8;font-size:11px;margin:8px 0 0 0;">Valid for 7 days, single use.</p>
              </div>
              <p style="color:#475569;">Sign in at UnBoxed Learning using <strong>${email}</strong>, then go to the Family page and enter the code above.</p>
            </div>
          `,
        });
        emailSent = true;
      } catch (err: any) {
        smtpError = err.message;
      }
    }

    return NextResponse.json({ success: true, code, email, emailSent, smtpError: smtpError || undefined, invitation });
  } catch (error) {
    return sendError(error);
  }
}
