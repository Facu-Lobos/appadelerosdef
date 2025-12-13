-- Add payment_status column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status text CHECK (payment_status IN ('paid', 'unpaid')) DEFAULT 'unpaid';

-- Add guest_name column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS guest_name text;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
