import type { VercelRequest, VercelResponse } from '@vercel/node';
import { allowMethods, readString, sendError } from '../../src/lib/api-utils/http';
import { createServerSupabase } from '../../src/lib/api-utils/supabase';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!allowMethods(req, res, ['POST'])) return;

  try {
    const email = readString(req.body?.email, 'email');
    const supabase = createServerSupabase(req);

    // 1. Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Please sign in to invite family members.' });
    }

    // 2. Fetch the membership to ensure they are the family owner
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('family_id, role, families(name)')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      return res.status(403).json({ error: 'Only the family owner can invite new members.' });
    }

    const familyName = (membership as any).families?.name ?? 'Our Family';

    // 3. Generate a secure, 6-character random joining code (e.g., UL-A3B7D9)
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars (O, 0, I, 1)
      let result = 'UL-';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const code = generateCode();

    // 4. Save invitation in Supabase database using RPC
    const { data: invitation, error: inviteError } = await supabase
      .rpc('create_family_invitation', {
        invite_email: email,
        invite_code: code,
      });

    if (inviteError) throw inviteError;

    // 5. Attempt SMTP Email dispatch
    let emailSent = false;
    let smtpError = '';

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM ?? '"UnBoxed Learning" <invitations@unboxedlearning.com>';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        const mailOptions = {
          from: smtpFrom,
          to: email,
          subject: `You've been invited to join the ${familyName} on UnBoxed Learning!`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; padding: 12px; background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%); border-radius: 16px; margin-bottom: 12px;">
                  <span style="font-size: 24px; color: white;">🎓</span>
                </div>
                <h1 style="font-size: 24px; font-weight: 800; color: #1e1b4b; margin: 0;">UnBoxed Learning</h1>
                <p style="font-size: 14px; color: #8b5cf6; margin: 4px 0 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;"> homeschooling workspace</p>
              </div>

              <h2 style="color: #1e1b4b; font-size: 20px; font-weight: 700; margin-bottom: 16px; text-align: center;">You have been invited!</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hello,
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                You have been invited to join the private homeschooling workspace <strong>${familyName}</strong> on UnBoxed Learning as a parent/educator.
              </p>

              <div style="text-align: center; margin: 32px 0; padding: 24px; background: linear-gradient(to bottom right, #f8fafc, #f1f5f9); border-radius: 16px; border: 1px dashed #cbd5e1;">
                <p style="color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.1em;">Your Secure Joining Code</p>
                <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; color: #4c1d95; letter-spacing: 0.15em; margin-bottom: 8px;">${code}</div>
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">This code is valid for 7 days and can only be used once.</p>
              </div>

              <h3 style="color: #1e1b4b; font-size: 16px; font-weight: 700; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">How to get started:</h3>
              <ol style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Visit <a href="${process.env.APP_URL ?? 'http://localhost:5173'}" style="color: #8b5cf6; font-weight: 600; text-decoration: none; border-bottom: 1px solid #ddd6fe;">UnBoxed Learning</a>.</li>
                <li style="margin-bottom: 10px;">Sign in using your Google account (<strong>${email}</strong>).</li>
                <li style="margin-bottom: 10px;">Go to the <strong>Family</strong> page in the sidebar menu.</li>
                <li style="margin-bottom: 10px;">Enter the joining code above and click <strong>Join Workspace</strong>.</li>
              </ol>

              <div style="margin-top: 40px; padding-top: 24px; border-t: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                  If you were not expecting this invite, you can safely ignore this email.
                </p>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (err: any) {
        smtpError = err.message;
        console.error('SMTP Delivery error:', err);
      }
    } else {
      console.log('----------------------------------------------------');
      console.log(`[LOCAL DEV MODE] Email Invitation Triggered!`);
      console.log(`[LOCAL DEV MODE] To: ${email}`);
      console.log(`[LOCAL DEV MODE] Joining Code: ${code}`);
      console.log(`[LOCAL DEV MODE] Family: ${familyName}`);
      console.log('----------------------------------------------------');
    }

    res.status(200).json({
      success: true,
      code,
      email,
      emailSent,
      smtpError: smtpError || undefined,
      invitation,
    });
  } catch (error) {
    sendError(res, error);
  }
}
