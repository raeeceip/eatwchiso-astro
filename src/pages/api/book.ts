import type { APIRoute } from 'astro';
import { Resend } from 'resend';

interface BookingRequest {
  name: string;
  email: string;
  date: string;
  time: string;
  partySize: string;
  preferences: {
    pancakeType: string;
    eggStyle: string;
    sides: string[];
    meat: string;
    additions: string[];
  };
}

const WORKER_URL = 'https://eatwchiso-bookings.chiboguchisomu.workers.dev';

// Initialize Resend only if API key is available
const resend = import.meta.env.PUBLIC_RESEND_API_KEY ? new Resend(import.meta.env.PUBLIC_RESEND_API_KEY) : null;

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const time = url.searchParams.get('time');

  if (!date || !time) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Date and time are required'
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  try {
    const response = await fetch(`${WORKER_URL}/availability?date=${date}&time=${time}`);
    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const body = await request.json() as BookingRequest;
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(body.time)) {
      throw new Error('Invalid time format. Use HH:MM');
    }

    // Check availability with the worker
    const response = await fetch(`${WORKER_URL}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to book appointment');
    }

    const data = await response.json();

    // Generate a confirmation ID
    const confirmationId = `CHISO-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    // Format the email content
    const emailContent = `
Dear ${body.name},

Thank you for booking with Eat with Chiso! Here are your booking details:

Date: ${new Date(body.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${body.time}
Party Size: ${body.partySize}

Your Menu Selections:
- Pancakes: ${body.preferences.pancakeType}
${body.preferences.eggStyle ? `- Eggs: ${body.preferences.eggStyle}` : ''}
${body.preferences.sides.length > 0 ? `- Sides: ${body.preferences.sides.join(', ')}` : ''}
${body.preferences.meat ? `- Meat: ${body.preferences.meat}` : ''}
${body.preferences.additions.length > 0 ? `- Additions: ${body.preferences.additions.join(', ')}` : ''}

Confirmation ID: ${confirmationId}

Please keep this confirmation ID for your records. If you need to make any changes to your booking, please contact us with this ID.

Best regards,
Eat with Chiso Team`;

    // Send confirmation email using Resend if available
    let emailSent = false;
    if (resend) {
      try {
        const emailResult = await resend.emails.send({
          from: 'Eat with Chiso <bookings@eatwchiso.com>',
          to: body.email,
          subject: 'Your Eat with Chiso Booking Confirmation',
          text: emailContent,
        });
        emailSent = !emailResult.error;
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          confirmationId,
          message: emailSent 
            ? 'Booking confirmed! Check your email for confirmation details.'
            : 'Booking confirmed! Email confirmation could not be sent.',
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process booking',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
