export interface SiteSettings {
  feedback_form_url: string;
  feedback_form_edit_url: string;
  archive_intro_quote: string;
  archive_intro_attribution: string;
  archive_intro_description: string;
  archive_growth_note: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  feedback_form_url: 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/viewform',
  feedback_form_edit_url: 'https://docs.google.com/forms/d/1VgXbG81Gxloes4cTGcfwzqlfiHxwmToqe_obSj_Mv9w/edit',
  archive_intro_quote: 'Matter shall reveal the Spirit’s face',
  archive_intro_attribution: 'Sri Aurobindo',
  archive_intro_description:
    'A living archive of All India Magazine and Agnishikha, offering a gateway to the timeless wisdom of Sri Aurobindo and the Mother. Discover their illuminating vision of life, the evolution of consciousness, and the spiritual transformation of earthly existence.',
  archive_growth_note:
    'Earlier editions of both All India Magazine and Agnishikha from 1971 onwards are being carefully digitised, reviewed, and added to the archive in stages. More issues will appear here as each collection is completed.',
};
