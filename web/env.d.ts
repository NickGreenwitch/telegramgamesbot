/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
  };
  ready(): void;
  close(): void;
  expand(): void;
  MainButton: {
    text: string;
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
  };
  BackButton: {
    show(): void;
    hide(): void;
    onClick(fn: () => void): void;
  };
  themeParams: Record<string, string>;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
