export type Mood = "grail" | "memory" | "favorite" | "regret";

export type FeedItem = {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    verified?: boolean;
  };
  time: string;
  kind: "item" | "collection" | "wishlist";
  collection: string;
  title: string;
  description: string;
  image: string;
  images?: string[];
  imageAlt: string;
  mood?: Mood;
  metadata: string[];
  likes: number;
  comments: number;
  wishlists: number;
};

export const feedItems: FeedItem[] = [
  {
    id: "jordan-1",
    author: {
      name: "Maya Chen",
      handle: "mayacurates",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85",
      verified: true,
    },
    time: "18m",
    kind: "item",
    collection: "Archive sneakers / Nike",
    title: "Jordan 1 High ‘85 — Neutral Grey",
    description:
      "A quiet pair with a loud history. Finally found my size after two years of looking — deadstock, yellowed in exactly the right way.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=88",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=88",
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1400&q=88",
      "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1400&q=88",
    ],
    imageAlt: "Red and white collectible sneaker",
    mood: "grail",
    metadata: ["2021", "US 7.5", "Deadstock"],
    likes: 284,
    comments: 41,
    wishlists: 76,
  },
  {
    id: "camera-1",
    author: {
      name: "Theo Martin",
      handle: "halfframe",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
    },
    time: "1h",
    kind: "wishlist",
    collection: "Wishlist / Film cameras",
    title: "Contax T2 in champagne",
    description:
      "The one I keep coming back to. Saving this here so future me remembers not to settle for the black body.",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=88",
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=88",
      "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?auto=format&fit=crop&w=1400&q=88",
      "https://images.unsplash.com/photo-1495121605193-b116b5b09a0?auto=format&fit=crop&w=1400&q=88",
    ],
    imageAlt: "Vintage silver film camera",
    mood: "favorite",
    metadata: ["35mm", "Point & shoot", "1990"],
    likes: 151,
    comments: 26,
    wishlists: 93,
  },
  {
    id: "chair-1",
    author: {
      name: "Noor Ali",
      handle: "softcorners",
      avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=85",
      verified: true,
    },
    time: "3h",
    kind: "collection",
    collection: "Collection update / Chairs",
    title: "Five years of sitting beautifully",
    description:
      "Added the little Cesca today. The collection is finally starting to feel like a conversation instead of a checklist.",
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1400&q=88",
    images: [
      "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1400&q=88",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=88",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=88",
    ],
    imageAlt: "A sculptural tan chair",
    mood: "memory",
    metadata: ["12 pieces", "2019—now", "Design"],
    likes: 392,
    comments: 58,
    wishlists: 34,
  },
];

export const collectionCards = [
  {
    title: "Archive sneakers",
    slug: "archive-sneakers",
    ownerHandle: "mayacurates",
    subtitle: "Nike, New Balance + 4",
    count: 38,
    privacy: "Public",
    image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1000&q=88",
    accent: "#f0ff9b",
  },
  {
    title: "Mechanical watches",
    slug: "mechanical-watches",
    ownerHandle: "found.daily",
    subtitle: "Seiko, Hamilton + 2",
    count: 16,
    privacy: "Public",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=88",
    accent: "#d7e6ff",
  },
  {
    title: "Records I kept",
    slug: "records-i-kept",
    ownerHandle: "smallmuseum",
    subtitle: "Jazz, Soul, Ambient",
    count: 74,
    privacy: "Public",
    image: "https://images.unsplash.com/photo-1461360228754-6e81c478b882?auto=format&fit=crop&w=1000&q=88",
    accent: "#ffd4c8",
  },
  {
    title: "Childhood things",
    slug: "childhood-things",
    ownerHandle: "arjcollects",
    subtitle: "Toys, tickets, tiny stories",
    count: 27,
    privacy: "Private",
    image: "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=1000&q=88",
    accent: "#e8dcff",
  },
];

export const matches = [
  {
    name: "Maya Chen",
    handle: "mayacurates",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=85",
    score: 88,
    shared: ["Nike", "New Balance", "Film cameras"],
  },
  {
    name: "Jon Bell",
    handle: "found.daily",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=85",
    score: 76,
    shared: ["Seiko", "Vinyl", "Print"],
  },
  {
    name: "Leila Okafor",
    handle: "smallmuseum",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=85",
    score: 71,
    shared: ["Adidas", "Design books"],
  },
];

export const conversations = [
  {
    name: "Maya Chen",
    avatar: matches[0].avatar,
    message: "That 990v3 colorway is unreal — trade someday?",
    time: "2m",
    unread: 2,
    online: true,
  },
  {
    name: "The Film Club",
    handle: null,
    avatar: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=200&q=85",
    message: "Theo shared an item",
    time: "24m",
    unread: 5,
    online: false,
  },
  {
    name: "Jon Bell",
    handle: "found.daily",
    avatar: matches[1].avatar,
    message: "Perfect, call you Saturday.",
    time: "1h",
    unread: 0,
    online: true,
  },
  {
    name: "Leila Okafor",
    handle: "smallmuseum",
    avatar: matches[2].avatar,
    message: "Saved it to my design shelf!",
    time: "Yesterday",
    unread: 0,
    online: false,
  },
];

export const comments = [
  {
    id: "comment-jon",
    name: "Jon Bell",
    handle: "found.daily",
    avatar: matches[1].avatar,
    body: "The neutral grey ages so much better than people expect. Beautiful find.",
    time: "12m",
    likes: 18,
    replies: [
      {
        id: "comment-maya-reply",
        name: "Maya Chen",
        handle: "mayacurates",
        avatar: matches[0].avatar,
        body: "Exactly! The yellowing was the whole reason I chose this pair.",
        time: "8m",
        likes: 7,
      },
    ],
  },
  {
    id: "comment-rae",
    name: "Rae Kim",
    handle: "raekim",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=85",
    body: "Would love to see the box label too. Is it the original release packaging?",
    time: "5m",
    likes: 3,
    replies: [],
  },
];
