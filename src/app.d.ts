declare global {
  namespace App {
    interface PageState {
      hasciiEditor?: {
        section: 'photo' | 'style' | 'color' | 'tone';
        detail?: 'style' | 'import' | 'palette';
      };
    }
  }
}

export {};
