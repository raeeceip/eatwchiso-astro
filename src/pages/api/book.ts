import type { APIRoute } from "astro";
import { Resend } from 'resend';

// Access environment variables
const WORKER_URL = import.meta.env.PUBLIC_CLOUDFLARE_WORKER_URL;
const WORKER_API_KEY = import.meta.env.PUBLIC_CLOUDFLARE_API_KEY;
const RESEND_API_KEY = import.meta.env.PUBLIC_RESEND_API_KEY;

// Debug environment variables
console.log('Environment Variables:', {
  WORKER_URL: WORKER_URL ? 'set' : 'not set',
  WORKER_API_KEY: WORKER_API_KEY ? 'set' : 'not set',
  RESEND_API_KEY: RESEND_API_KEY ? 'set' : 'not set'
});

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface BookingData {
  name: string;
  email: string;
  date: string;
  time: string;
  partySize: string;
  preferences: {
    pancakeType: string;
    eggStyle: string;
    meat: string;
    sides: string[];
    additions: string[];
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as BookingData;

    // Validate required fields
    if (!body.name || !body.email || !body.date || !body.time || !body.partySize) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Generate a confirmation ID
    const confirmationId = `CHISO-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Store the booking in Cloudflare Workers KV
    if (!WORKER_URL) {
      throw new Error('Worker URL not configured. Please check your environment variables.');
    }

    console.log('Sending booking to worker:', {
      url: WORKER_URL,
      hasApiKey: !!WORKER_API_KEY,
      booking: {
        id: confirmationId,
        ...body,
      }
    });

    const workerResponse = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': WORKER_API_KEY || ''
      },
      body: JSON.stringify({
        action: 'createBooking',
        booking: {
          id: confirmationId,
          ...body,
          createdAt: new Date().toISOString()
        }
      })
    });

    if (!workerResponse.ok) {
      const error = await workerResponse.text();
      console.error('Worker error response:', error);
      throw new Error(`Worker error: ${error}`);
    }

    // Format the email content
    const emailContent = `
Dear ${body.name},

Thank you for booking with Chef Chiso! Here are your booking details:

Date: ${new Date(body.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${body.time}
Party Size: ${body.partySize}

Menu Selections:
${body.preferences.pancakeType ? `- Pancakes: ${body.preferences.pancakeType}` : ''}
${body.preferences.eggStyle !== 'none' ? `- Eggs: ${body.preferences.eggStyle}` : ''}
${body.preferences.meat !== 'none' ? `- Meat: ${body.preferences.meat}` : ''}
${body.preferences.sides.length > 0 ? `- Sides: ${body.preferences.sides.join(', ')}` : ''}
${body.preferences.additions.length > 0 ? `- Additions: ${body.preferences.additions.join(', ')}` : ''}

Confirmation ID: ${confirmationId}

Please keep this confirmation ID for your records. If you need to make any changes to your booking, please contact me directly.

Best regards,
Chef Chiso`;

    // Send confirmation email using Resend if available
    let emailResult = { success: false, error: null };
    if (resend) {
      try {
        const result = await resend.emails.send({
          from: 'onboarding@resend.dev', // Keep this for now until domain is verified
          reply_to: 'Chiso <chiboguchisomu@gmail.com>', // Replies will go to your Gmail
          to: body.email,
          subject: 'Your Chef Chiso Booking Confirmation',
          text: emailContent,
        });
        
        if (result.error) {
          emailResult = { 
            success: false, 
            error: typeof result.error === 'object' ? 
              result.error.message || 'Unknown email error' : 
              String(result.error)
          };
        } else {
          emailResult = { success: true, error: null };
        }
      } catch (error: any) {
        console.error('Email error:', error);
        emailResult = { 
          success: false, 
          error: error.message || 'Failed to send email confirmation'
        };
      }
    } else {
      emailResult = { 
        success: false, 
        error: 'Email service not configured. Please contact Chef Chiso directly to receive your confirmation email.'
      };
    }

    return new Response(JSON.stringify({
      success: true,
      confirmationId,
      emailSent: emailResult.success,
      emailError: emailResult.error
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('Booking error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process booking'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
