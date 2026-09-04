import { HeroSection }      from '@/components/catalog/HeroSection'
import { CategoryChips }    from '@/components/catalog/CategoryChips'
import { ListingsGrid }     from '@/components/catalog/ListingsGrid'
import { HowItWorks }       from '@/components/catalog/HowItWorks'
import { ProCta }           from '@/components/catalog/ProCta'
import { AppBanner }        from '@/components/catalog/AppBanner'
import { Header }           from '@/components/layout/Header'
import { Footer }           from '@/components/layout/Footer'
import { Reveal }           from '@/components/ui/Reveal'

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <CategoryChips />
        <Reveal><ListingsGrid /></Reveal>
        <Reveal><HowItWorks /></Reveal>
        <Reveal><AppBanner /></Reveal>
        <Reveal><ProCta /></Reveal>
      </main>
      <Footer />
    </>
  )
}
