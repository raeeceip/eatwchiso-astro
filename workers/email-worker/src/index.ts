interface EmailEnv {
  SENDGRID_API_KEY: string;
}

interface EmailRequest {
  to: string;
  name: string;
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
  confirmationId: string;
}

export default {
  async fetch(request: Request, env: EmailEnv): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data: EmailRequest = await request.json();
      
      // Format the email content
      const emailContent = `
Dear ${data.name},

Thank you for booking with Eat with Chiso! Here are your booking details:

Date: ${new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${data.time}
Party Size: ${data.partySize}

Your Menu Selections:
- Pancakes: ${data.preferences.pancakeType}
${data.preferences.eggStyle ? `- Eggs: ${data.preferences.eggStyle}` : ''}
${data.preferences.sides.length > 0 ? `- Sides: ${data.preferences.sides.join(', ')}` : ''}
${data.preferences.meat ? `- Meat: ${data.preferences.meat}` : ''}
${data.preferences.additions.length > 0 ? `- Additions: ${data.preferences.additions.join(', ')}` : ''}

Confirmation ID: ${data.confirmationId}

Please keep this confirmation ID for your records. If you need to make any changes to your booking, please contact us with this ID.

Best regards,
Eat with Chiso Team
`;

      // Send email using SendGrid
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: data.to }],
          }],
          from: { email: 'bookings@eatwchiso.com', name: 'Eat with Chiso' },
          subject: 'Your Eat with Chiso Booking Confirmation',
          content: [{
            type: 'text/plain',
            value: emailContent,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
