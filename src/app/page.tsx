import { AtelierStory } from "@/components/home/atelier-story";
import { EditorialSplit } from "@/components/home/editorial-split";
import { FeaturedCollections } from "@/components/home/featured-collections";
import { Hero } from "@/components/home/hero";
import { NewArrivals } from "@/components/home/new-arrivals";
import { Services } from "@/components/home/services";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedCollections />
      <NewArrivals />
      <EditorialSplit />
      <AtelierStory />
      <Services />
    </>
  );
}
