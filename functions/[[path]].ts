import type { StoredBooking, BookingDetails } from '../src/types/booking';

interface Env {
  BOOKINGS: DurableObjectNamespace;
  RESEND_API_KEY: string;
}

export class BookingsStore implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const method = request.method;

    switch (method) {
      case 'POST':
        return this.createBooking(request);
      case 'GET':
        return url.pathname === '/availability' 
          ? this.checkAvailability(url.searchParams)
          : this.getBookings(url.searchParams);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  private async createBooking(request: Request): Promise<Response> {
    try {
      const booking: BookingDetails = await request.json();
      const id = crypto.randomUUID();
      
      const storedBooking: StoredBooking = {
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
      await this.sendConfirmationEmail(storedBooking);

      return new Response(JSON.stringify({
        success: true,
        data: storedBooking
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async checkAvailability(params: URLSearchParams): Promise<Response> {
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
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check availability'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async getBookings(params: URLSearchParams): Promise<Response> {
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
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bookings'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async getBookingsForDate(date: string): Promise<StoredBooking[]> {
    const bookings: StoredBooking[] = [];
    const prefix = `date:${date}:`;
    
    const list = await this.state.storage.list({ prefix });
    for (const [, id] of list) {
      const booking = await this.state.storage.get(`booking:${id}`);
      if (booking) {
        bookings.push(booking as StoredBooking);
      }
    }
    
    return bookings;
  }

  private calculateAvailableSlots(bookings: StoredBooking[]): string[] {
    const AVAILABLE_TIMES = [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM'
    ];
    
    // Count bookings per time slot
    const bookingsPerSlot = new Map<string, number>();
    bookings.forEach(booking => {
      const count = bookingsPerSlot.get(booking.time) || 0;
      bookingsPerSlot.set(booking.time, count + 1);
    });
    
    // Return time slots with less than 2 bookings
    return AVAILABLE_TIMES.filter(time => 
      (bookingsPerSlot.get(time) || 0) < 2
    );
  }

  private async sendConfirmationEmail(booking: StoredBooking) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'booking@eatwchiso.pages.dev',
          to: booking.email,
          subject: 'Booking Confirmation - Eat with Chiso',
          html: `
            <h1>Booking Confirmation</h1>
            <p>Dear ${booking.name},</p>
            <p>Your booking has been confirmed for ${booking.date} at ${booking.time}.</p>
            <h2>Booking Details:</h2>
            <ul>
              <li>Date: ${booking.date}</li>
              <li>Time: ${booking.time}</li>
              <li>Guests: ${booking.guests}</li>
              <li>Menu:</li>
              <ul>
                <li>Pancakes: ${booking.preferences.pancakeType}</li>
                <li>Eggs: ${booking.preferences.eggStyle}</li>
                <li>Sides: ${booking.preferences.sides.join(', ')}</li>
                <li>Meat: ${booking.preferences.meat}</li>
                <li>Additions: ${booking.preferences.additions.join(', ')}</li>
              </ul>
            </ul>
            <p>Booking ID: ${booking.id}</p>
            <p>Thank you for choosing Eat with Chiso!</p>
          `
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send confirmation email');
      }
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  }
}

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const url = new URL(request.url);

  // If it's not an API request, let Astro handle it
  if (!url.pathname.startsWith('/api/')) {
    return context.next();
  }

  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Forward the request to the appropriate handler
    const response = await context.next();
    
    // Add CORS headers to the response
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};
