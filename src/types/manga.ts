export interface Chapter {
  id: string;
  link: string;
  label: string;
  chapterNumber?: number;
  date: string;
  pages: string[];
  downloading: boolean;
  downloaded: boolean;
}

export interface Manga {
  title: string;
  cover?: string;
  chapters: Chapter[];
}
