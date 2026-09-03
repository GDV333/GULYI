export function BookingPage({ listingId }: { listingId: string }) {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Бронирование {listingId}</h1>
    </div>
  )
}