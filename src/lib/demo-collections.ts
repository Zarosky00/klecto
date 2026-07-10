import type { Visibility } from "@/lib/catalog-types";

export type DemoItem = {
  id: string;
  title: string;
  description: string;
  brand: string | null;
  details: string;
  mood: "grail" | "memory" | "favorite" | "regret" | "neutral";
  isFavorite: boolean;
  visibility: Visibility;
  image: string;
  createdAt: string;
};

export type DemoSubcollection = {
  id: string;
  name: string;
  description: string;
  kind: "brand" | "series" | "era" | "custom";
  visibility: Visibility | null;
  position: number;
  items: DemoItem[];
};

export type DemoCollection = {
  slug: string;
  name: string;
  description: string;
  owner: {
    name: string;
    username: string;
  };
  visibility: Visibility;
  coverUrl: string;
  updatedAt: string;
  subcollections: DemoSubcollection[];
  directItems: DemoItem[];
};

const childhoodThings: DemoCollection = {
  slug: "childhood-things",
  name: "Childhood things",
  description: "Toys, tickets, and the small proof that a good day happened.",
  owner: { name: "Arjun Kapoor", username: "arjcollects" },
  visibility: "private",
  coverUrl: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=1400&q=88",
  updatedAt: "2026-07-09T10:20:00.000Z",
  subcollections: [
    {
      id: "toy-box",
      name: "The toy box",
      description: "The consoles and toy cars that survived every room change.",
      kind: "custom",
      visibility: null,
      position: 0,
      items: [
        {
          id: "game-boy-advance",
          title: "Midnight game controller",
          description: "The controller that survived every weekend tournament with one stubborn trigger.",
          brand: "Sony",
          details: "Black · 2010 · loved",
          mood: "memory",
          isFavorite: true,
          visibility: "private",
          image: "https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1100&q=88",
          createdAt: "2026-07-09T10:20:00.000Z",
        },
        {
          id: "wooden-train",
          title: "Red toy roadster",
          description: "A tiny red car that still rolls perfectly across the kitchen floor.",
          brand: null,
          details: "Red paint · 1998 · well loved",
          mood: "favorite",
          isFavorite: false,
          visibility: "private",
          image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=1100&q=88",
          createdAt: "2026-07-03T10:20:00.000Z",
        },
      ],
    },
    {
      id: "paper-trail",
      name: "Paper trail",
      description: "Tickets, notes, and printed things that refused to become clutter.",
      kind: "era",
      visibility: "followers",
      position: 1,
      items: [
        {
          id: "first-concert-ticket",
          title: "First concert ticket",
          description: "Folded four times, kept because the whole night felt larger than it was.",
          brand: null,
          details: "Mumbai · 2011 · ticket stub",
          mood: "memory",
          isFavorite: true,
          visibility: "followers",
          image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1100&q=88",
          createdAt: "2026-06-22T10:20:00.000Z",
        },
        {
          id: "library-card",
          title: "Library card",
          description: "The first place that made collecting books feel like a private superpower.",
          brand: null,
          details: "Paper card · 2006 · worn",
          mood: "neutral",
          isFavorite: false,
          visibility: "private",
          image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1100&q=88",
          createdAt: "2026-06-15T10:20:00.000Z",
        },
      ],
    },
    {
      id: "weekend-cameras",
      name: "Weekend cameras",
      description: "The camera that made ordinary afternoons feel worth framing.",
      kind: "brand",
      visibility: null,
      position: 2,
      items: [
        {
          id: "disposable-camera",
          title: "Disposable camera, 27 exposures",
          description: "Still unopened. Saving it for a day that becomes a story later.",
          brand: "Fujifilm",
          details: "35mm · 27 exposures · unopened",
          mood: "grail",
          isFavorite: false,
          visibility: "private",
          image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1100&q=88",
          createdAt: "2026-06-08T10:20:00.000Z",
        },
      ],
    },
  ],
  directItems: [
    {
      id: "postcard",
      title: "Postcard from home",
      description: "The one my mother wrote after my first solo trip.",
      brand: null,
      details: "Kolkata · 2014 · handwritten",
      mood: "memory",
      isFavorite: true,
      visibility: "private",
      image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1100&q=88",
      createdAt: "2026-05-30T10:20:00.000Z",
    },
  ],
};

const demoCollections = [childhoodThings];

export function getDemoCollection(slug: string) {
  return demoCollections.find((collection) => collection.slug === slug) ?? null;
}
