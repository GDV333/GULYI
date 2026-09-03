import { BookingPage } from '@/components/booking/BookingPage'
export default function Booking({ params }: { params: { id: string } }) {
  return <BookingPage listingId={params.id} />
}
