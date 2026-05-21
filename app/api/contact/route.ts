import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    // Check if API key is missing or is placeholder/unconfigured
    if (!apiKey || apiKey === 'PLACEHOLDER' || apiKey === 'YOUR_RESEND_API_KEY' || !apiKey.startsWith('re_')) {
      console.warn("RESEND_API_KEY is not configured or is set to a placeholder:", apiKey);
      return NextResponse.json(
        { error: 'Resend API key is unconfigured on the server. Please configure your RESEND_API_KEY.' },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    const body = await req.json();
    const { name, agency, email, details } = body;

    if (!name || !email || !details) {
      return NextResponse.json(
        { error: 'Name, email, and details are required.' },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: 'Contact Form <onboarding@resend.dev>',
      to: ['contact@henryix.com'],
      replyTo: email,
      subject: `New Booking Inquiry from ${name}`,
      text: `
You have received a new message from your website contact form.

Name: ${name}
Agency/Entity: ${agency || 'N/A'}
Email: ${email}

Details:
${details}
      `,
    });

    if (data.error) {
      console.error("Resend API error detail:", data.error);
      return NextResponse.json({
        error: `Resend API Error: ${data.error.message}. Troubleshooting: Please check your Resend dashboard, ensure the sender and recipient domains are verified, or verify that your API key is active.`
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing contact email POST request:", error);
    return NextResponse.json({
      error: `Resend API Execution Failure: ${error.message || 'Failed to send email'}. Troubleshooting: Make sure your RESEND_API_KEY environment variable is valid and active in .env.local, and that the sender domain matches a verified domain on your Resend account.`
    }, { status: 400 });
  }
}

