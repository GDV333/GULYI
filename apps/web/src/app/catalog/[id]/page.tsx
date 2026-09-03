'use client'
import { ProfilePage } from '@/components/catalog/ProfilePage'
export default function Profile({ params }: { params: { id: string } }) {
  return <ProfilePage id={params.id} />
}