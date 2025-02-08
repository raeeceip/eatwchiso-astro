export interface BookingDetails {
  name: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  preferences: {
    pancakeType: string;
    eggStyle: string;
    sides: string[];
    meat: string;
    additions: string[];
  };
}

export interface StoredBooking extends BookingDetails {
  id: string;
  createdAt: string;
}

export interface BookingResponse {
  success: boolean;
  data?: StoredBooking;
  error?: string;
}
