import { EventPage } from '@/components/events/EventPage'
export default function Event({ params }: { params: { id: string } }) {
  return <EventPage id={params.id} />
}
