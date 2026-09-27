export type BeforeAfterPiece = {
  id: string;
  title: string;
  before: { src: string; alt: string };
  after: { src: string; alt: string };
};

export type StillPiece = {
  id: string;
  src: string;
  alt: string;
  caption: string;
};

export type FilmPiece = {
  id: string;
  src: string;
  caption: string;
};

export type HeroSlide = {
  src: string;
  alt: string;
  caption: string;
  focus?: string;
};

export const heroSlides: HeroSlide[] = [
  {
    src: "/media/wig-installation.jpeg",
    alt: "Wig installation at Impact Beauty Studio",
    caption: "Wig installation by Vee",
    focus: "center 18%",
  },
  {
    src: "/media/studio-portrait-1.jpg",
    alt: "Vee seated in the studio chair at Impact Beauty Studio",
    caption: "Impact Beauty Studio",
    focus: "center 15%",
  },
  {
    src: "/media/studio-portrait-2.jpg",
    alt: "Vee in the studio at Impact Beauty Studio",
    caption: "Your beauty. Your confidence. Your impact.",
    focus: "center 12%",
  },
];

export const beforeAfterWork: BeforeAfterPiece[] = [
  {
    id: "makeup",
    title: "Makeup",
    before: {
      src: "/media/makeup-before.jpeg",
      alt: "Client before makeup",
    },
    after: {
      src: "/media/makeup-after.jpeg",
      alt: "The same client after makeup by Vee",
    },
  },
];

export const stillWork: StillPiece[] = [
  {
    id: "wig-installation",
    src: "/media/wig-installation.jpeg",
    alt: "Wig installation at Impact Beauty Studio",
    caption: "Wig installation",
  },
];

export const filmWork: FilmPiece[] = [
  {
    id: "studio",
    src: "/media/studio-work.mp4",
    caption: "In the studio",
  },
];
