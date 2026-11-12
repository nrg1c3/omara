import { render } from 'preact';
import { App } from './app';
import './styles/base.css';

render(<App />, document.getElementById('app')!);

// Service worker: بس في الـ build (مش في dev) وعلى origin حقيقي.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !navigator.webdriver) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
