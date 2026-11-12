import { Card } from '../components/Card';

/** مكان شاشة لسه ما اتبنتش (المراحل الجاية) */
export function Placeholder({ title, phase }: { title: string; phase: number }) {
  return (
    <Card title={title}>
      <p class="muted">الشاشة دي لسه بتتبني (المرحلة {phase}).</p>
    </Card>
  );
}

export function PlaceholderScreen({ title, phase }: { title: string; phase: number }) {
  return (
    <main class="screen">
      <h1 class="screen__title">{title}</h1>
      <Placeholder title={title} phase={phase} />
      <a class="btn btn--secondary btn--block" href="#login">
        رجوع لشاشة الدخول
      </a>
    </main>
  );
}
