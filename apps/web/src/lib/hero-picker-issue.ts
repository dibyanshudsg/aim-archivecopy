export interface HeroPickerIssue {
  id: string;
  magazine_id: string;
  magazine_name: string;
  title: string;
  theme: string | null;
  year: number;
  month: number;
  cover_image_url: string | null;
  readable: boolean;
}
