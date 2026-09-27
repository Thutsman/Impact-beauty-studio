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
      alt: "The same client after makeup by Yvonnie",
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
