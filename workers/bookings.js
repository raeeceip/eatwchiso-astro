export class BookingsStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  // Helper to add CORS headers
  corsHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: this.corsHeaders(),
        status: 204,
      });
    }

    // Handle root path
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        success: true,
        message: 'Welcome to Eat with Chiso Terminal Booking System v1.0.0',
        service: 'https://eatwchiso-bookings.chiboguchisomu.workers.dev',
        endpoints: [
          '/availability?date=YYYY-MM-DD',
          '/bookings?date=YYYY-MM-DD'
        ]
      }),{
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders()
        }
      });
    }

    try {
      let response;
      switch (method) {
        case 'POST':
          response = await this.createBooking(request);
          break;
        case 'GET':
          response = url.pathname === '/availability' 
            ? await this.checkAvailability(url.searchParams)
            : await this.getBookings(url.searchParams);
          break;
        default:
          response = new Response('Method not allowed', { 
            status: 405,
            headers: this.corsHeaders()
          });
      }

      // Add CORS headers to the response
      const newHeaders = new Headers(response.headers);
      Object.entries(this.corsHeaders()).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders()
        }
      });
    }
  }

  async createBooking(request) {
    try {
      const booking = await request.json();
      const id = crypto.randomUUID();
      
      const storedBooking = {
        ...booking,
        id,
        createdAt: new Date().toISOString(),
      };

      // Store booking with date as key for easy retrieval
      const dateKey = new Date(booking.date).toISOString().split('T')[0];
      const existingBookings = await this.getBookingsForDate(dateKey);
      
      // Check if we've reached maximum bookings for the day
      if (existingBookings.length >= 8) {
        return new Response(JSON.stringify({
          success: false,
          error: 'No more bookings available for this date'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Store the booking
      await this.state.storage.put(`booking:${id}`, storedBooking);
      await this.state.storage.put(`date:${dateKey}:${id}`, id);

      // Send confirmation email
      try {
        await this.sendConfirmationEmail(storedBooking);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Continue with the booking process even if email fails
      }

      return new Response(JSON.stringify({
        success: true,
        data: storedBooking
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async checkAvailability(params) {
    try {
      const date = params.get('date');
      if (!date) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Date parameter is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const bookings = await this.getBookingsForDate(date);
      const availableSlots = this.calculateAvailableSlots(bookings);

      return new Response(JSON.stringify({
        success: true,
        data: { availableSlots }
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders()
        }
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check availability'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders()
        }
      });
    }
  }

  async getBookings(params) {
    try {
      const date = params.get('date');
      if (!date) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Date parameter is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const bookings = await this.getBookingsForDate(date);
      return new Response(JSON.stringify({
        success: true,
        data: bookings
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders()
        }
      });
    } catch (error) {
      console.error('Error getting bookings:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bookings'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...this.corsHeaders()
        }
      });
    }
  }

  async getBookingsForDate(date) {
    const bookings = [];
    const prefix = `date:${date}:`;
    
    const list = await this.state.storage.list({ prefix });
    for (const [, id] of list) {
      const booking = await this.state.storage.get(`booking:${id}`);
      if (booking) {
        bookings.push(booking);
      }
    }
    
    return bookings;
  }

  calculateAvailableSlots(bookings) {
    const AVAILABLE_TIMES = [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'
    ];
    
    // Count bookings per time slot
    const bookingsPerSlot = new Map();
    bookings.forEach(booking => {
      const count = bookingsPerSlot.get(booking.time) || 0;
      bookingsPerSlot.set(booking.time, count + 1);
    });
    
    // Return time slots with less than 2 bookings
    return AVAILABLE_TIMES.filter(time => 
      (bookingsPerSlot.get(time) || 0) < 2
    );
  }

  async sendConfirmationEmail(booking) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Eat with Chiso <booking@eatwchiso.pages.dev>',
          to: booking.email,
          subject: 'Booking Confirmation - Eat with Chiso',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2d3748; border-bottom: 2px solid #4a5568; padding-bottom: 10px;">Booking Confirmation</h1>
              
              <p style="color: #4a5568;">Dear ${booking.name},</p>
              
              <p style="color: #4a5568;">Your booking has been confirmed! Here are your booking details:</p>
              
              <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #2d3748; margin-top: 0;">Booking Details</h2>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin: 10px 0;"><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
                  <li style="margin: 10px 0;"><strong>Time:</strong> ${booking.time}</li>
                  <li style="margin: 10px 0;"><strong>Number of Guests:</strong> ${booking.guests}</li>
                </ul>
                
                <h3 style="color: #2d3748; margin-top: 20px;">Menu Selections</h3>
                <ul style="list-style: none; padding: 0;">
                  <li style="margin: 10px 0;"><strong>Pancakes:</strong> ${booking.preferences.pancakeType}</li>
                  <li style="margin: 10px 0;"><strong>Eggs:</strong> ${booking.preferences.eggStyle}</li>
                  <li style="margin: 10px 0;"><strong>Sides:</strong> ${booking.preferences.sides.join(', ')}</li>
                  <li style="margin: 10px 0;"><strong>Meat:</strong> ${booking.preferences.meat}</li>
                  <li style="margin: 10px 0;"><strong>Additions:</strong> ${booking.preferences.additions.join(', ')}</li>
                </ul>
              </div>
              
              <p style="color: #4a5568;"><strong>Booking ID:</strong> ${booking.id}</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #4a5568;">
                <p style="color: #4a5568;">Thank you for choosing Eat with Chiso! We're looking forward to serving you.</p>
                <p style="color: #4a5568;">If you need to make any changes to your booking, please contact us with your booking ID.</p>
              </div>
            </div>
          `
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      // Don't throw the error - we don't want to fail the booking if email fails
    }
  }
}

export default {
  fetch(request, env) {
    const id = env.BOOKINGS.idFromName('bookings');
    const obj = env.BOOKINGS.get(id);
    return obj.fetch(request);
  }
};
