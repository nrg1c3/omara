import { useEffect, useRef, useState } from 'preact/hooks';
import { call, chat, type InstallmentPlan, type Poll } from '../../api';
import { Button } from '../../components/Button';
import { Card, Progress } from '../../components/Card';
import { Choice } from '../../components/Form';
import { Icon } from '../../components/Icon';
import { CardSkeleton, Loading } from '../../components/Loading';
import { ErrorMessage } from '../../components/Messages';
import { Badge, Empty, MenuLink, PageHeader, Row } from '../../components/Page';
import { Qr } from '../../components/Qr';
import { ShareBox } from '../../components/ShareBox';
import { appUrl, residentLink, useInstall } from '../../lib/app';
import { formatMoney, formatNumber, formatDate } from '../../lib/format';
import { readJSON, writeJSON } from '../../lib/storage';
import { useAction } from '../../lib/useAction';
import { buildingName } from '../../lib/view';
import { logout, refreshX, refreshY, useAppState } from '../../store';

export function More({ sub }: { sub?: string }) {
  if (sub === 'polls') return <Polls />;
  if (sub === 'notices') return <Notices back="#r/more" />;
  if (sub === 'plans') return <Plans back="#r/more" />;
  if (sub === 'chat') return <Assistant />;
  if (sub === 'account') return <Account />;
  if (sub === 'invite') return <Invite back="#r/more" />;
  return <Menu />;
}

function Menu() {
  const { x, y, resident: v } = useAppState();
  const { canInstall, install } = useInstall();
  useEffect(() => {
    refreshX().catch(() => {});
    refreshY().catch(() => {});
  }, []);
  const openPolls = (x?.polls ?? []).filter((p) => !p.closed && !p.my_choice).length;
  const hasPlan = (y?.plans ?? []).length > 0;
  return (
    <>
      <PageHeader title="المزيد" />
      <nav class="menu" aria-label="المزيد">
        <MenuLink href="#r/more/polls" icon="vote" label="التصويت" note={openPolls ? `${formatNumber(openPolls)} مفتوح` : undefined} />
        <MenuLink href="#r/more/notices" icon="megaphone" label="الإعلانات" note={v?.notices?.length ? formatNumber(v.notices.length) : undefined} />
        {hasPlan && <MenuLink href="#r/more/plans" icon="calendar" label="أقساطي" />}
        <MenuLink href="#r/more/chat" icon="chat" label="اسأل المساعد" />
        <MenuLink href="#r/more/account" icon="key" label="كود شقتي" />
        <MenuLink href="#r/more/invite" icon="gift" label="عمارة صاحبك محتاجة التطبيق؟" />
        {canInstall && <MenuLink onClick={install} icon="download" label="نزّل التطبيق على الموبايل" />}
      </nav>
      <Button variant="secondary" block icon="logout" onClick={() => logout()}>
        خروج
      </Button>
    </>
  );
}

/* ================= التصويت ================= */

function Polls() {
  const { x } = useAppState();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    refreshX().catch((e: Error) => setErr(e.message));
  }, []);
  const polls = x?.polls ?? [];
  return (
    <>
      <PageHeader title="التصويت" back="#r/more" subtitle="صوت واحد لكل شقة ومينفعش يتغيّر. النتيجة استرشادية ومش محضر جمعية عمومية رسمي." />
      <ErrorMessage error={err} />
      {!x ? <CardSkeleton /> : polls.length === 0 ? <Empty icon="vote">مفيش تصويت دلوقتي.</Empty> : polls.map((p) => <PollCard key={p.no} poll={p} canVote />)}
    </>
  );
}

export function PollCard({ poll, canVote, children }: { poll: Poll; canVote?: boolean; children?: preact.ComponentChildren }) {
  const [choice, setChoice] = useState('');
  const act = useAction();
  const voted = !!poll.my_choice;
  const total = (poll.results ?? []).reduce((s, r) => s + r.count, 0);
  const showResults = poll.closed || voted || !canVote;
  return (
    <Card>
      <div class="section-title" style={{ alignItems: 'flex-start' }}>
        <span>{poll.question}</span>
        <Badge tone={poll.closed ? 'neutral' : 'warn'}>{poll.closed ? 'اتقفل' : 'مفتوح'}</Badge>
      </div>
      {poll.ends_on && !poll.closed && <span class="muted">مفتوح لحد {formatDate(poll.ends_on)}</span>}
      {canVote && !poll.closed && !voted && (
        <>
          <Choice label="اختار" value={choice} onChange={setChoice} options={poll.options.map((o) => ({ value: o, label: o }))} />
          <ErrorMessage error={act.error} />
          <Button
            block
            loading={act.busy}
            disabled={!choice}
            onClick={() => {
              if (confirm(`هتصوّت بـ "${choice}". مينفعش تغيّره بعد كده. تأكد؟`)) act.run(() => call('x_vote', { poll_no: poll.no, choice }).then(() => refreshX()));
            }}
          >
            صوّت
          </Button>
        </>
      )}
      {voted && (
        <span class="badge badge--success" style={{ alignSelf: 'flex-start' }}>
          <Icon name="check" size={16} /> صوّت بـ: {poll.my_choice}
        </span>
      )}
      {showResults && (poll.results ?? []).length > 0 && (
        <div class="stack">
          {(poll.results ?? []).map((r) => (
            <div key={r.option} class="bar-row">
              <div class="bar-row__head">
                <span>{r.option}</span>
                <span class="num">
                  {formatNumber(r.count)} صوت{total ? ` (${Math.round((r.count / total) * 100)}%)` : ''}
                </span>
              </div>
              <Progress value={r.count} max={total || 1} label={r.option} />
            </div>
          ))}
        </div>
      )}
      {poll.total_units !== undefined && (
        <span class="muted">
          المشاركة: {formatNumber(poll.participation ?? 0)}% من {formatNumber(poll.total_units)} شقة
        </span>
      )}
      {children}
    </Card>
  );
}

/* ================= الإعلانات ================= */

export function Notices({ back }: { back: string }) {
  const { resident, admin } = useAppState();
  const notices = (resident || admin)?.notices ?? [];
  return (
    <>
      <PageHeader title="الإعلانات" back={back} />
      {notices.length === 0 ? (
        <Empty icon="megaphone">مفيش إعلانات.</Empty>
      ) : (
        notices.map((n, i) => (
          <Card key={n.no ?? i} title={n.title}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p>
            <span class="muted">{[n.by, formatDate(n.date)].filter(Boolean).join(' · ')}</span>
          </Card>
        ))
      )}
    </>
  );
}

/* ================= الأقساط ================= */

export function PlanCard({ p, children }: { p: InstallmentPlan; children?: preact.ComponentChildren }) {
  return (
    <Card>
      <div class="section-title">
        <span>شقة {p.unit}</span>
        <Badge tone={p.late_installments > 0 ? 'warn' : p.left <= 0 ? 'success' : 'neutral'}>{p.status}</Badge>
      </div>
      <dl class="stack" style={{ gap: 0, margin: 0 }}>
        <div class="kv">
          <dt>الإجمالي</dt>
          <dd>{formatMoney(p.total)}</dd>
        </div>
        <div class="kv">
          <dt>القسط</dt>
          <dd>
            {formatMoney(p.per_month)} × {formatNumber(p.months)} شهور
          </dd>
        </div>
        <div class="kv">
          <dt>اتدفع</dt>
          <dd>{formatMoney(p.paid)}</dd>
        </div>
        <div class="kv">
          <dt>الباقي</dt>
          <dd>{formatMoney(p.left)}</dd>
        </div>
      </dl>
      <Progress value={p.paid} max={p.total} label="اللي اتدفع من الخطة" />
      <div class="list">
        {p.schedule.map((s) => (
          <Row key={s.month} title={s.label} value={formatMoney(s.amount)} badge={s.done ? <Badge tone="success">اتدفع</Badge> : s.due ? <Badge tone="warn">مستحق</Badge> : <Badge tone="neutral">لسه</Badge>} />
        ))}
      </div>
      {p.note && <span class="muted">{p.note}</span>}
      {children}
    </Card>
  );
}

function Plans({ back }: { back: string }) {
  const { y } = useAppState();
  useEffect(() => {
    refreshY().catch(() => {});
  }, []);
  return (
    <>
      <PageHeader title="أقساطي" back={back} subtitle="أي دفعة بتتسجل لشقتك بتتخصم من الأقساط لوحدها." />
      {!y ? <CardSkeleton /> : y.plans.length === 0 ? <Empty icon="calendar">مفيش خطة تقسيط.</Empty> : y.plans.map((p) => <PlanCard key={p.no} p={p} />)}
    </>
  );
}

/* ================= المساعد ================= */

interface Msg {
  me: boolean;
  text: string;
}

function chatSessionId(): string {
  let id = readJSON<string>('chat.session');
  if (!id) {
    id = `omara-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    writeJSON('chat.session', id);
  }
  return id;
}

const SUGGESTIONS = ['عليا كام؟', 'أدفع إزاي بإنستاباي؟', 'الفلوس اتصرفت على إيه الشهر ده؟'];

/** المساعد بيعرف الساكن من كود الدفع في الرسالة (بيفتكره 3 ساعات لكل sessionId)، فبنبعته مع أول رسالة بعد كل فتح للصفحة */
let codeSentThisLoad = false;

function Assistant() {
  const { resident: v } = useAppState();
  const [msgs, setMsgs] = useState<Msg[]>(() => readJSON<Msg[]>('chat.msgs') ?? []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeJSON('chat.msgs', msgs.slice(-30));
    end.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy]);

  const send = async (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setErr(null);
    setText('');
    setMsgs((m) => [...m, { me: true, text: t }]);
    setBusy(true);
    try {
      const prefix = v && !codeSentThisLoad ? `كود الدفع بتاعي ${v.pay_code}. ` : '';
      const out = await chat(chatSessionId(), prefix + t);
      codeSentThisLoad = true;
      setMsgs((m) => [...m, { me: false, text: out }]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="المساعد"
        back="#r/more"
        action={
          msgs.length > 0 ? (
            <Button
              variant="ghost"
              icon="refresh"
              onClick={() => {
                writeJSON('chat.session', null);
                codeSentThisLoad = false;
                setMsgs([]);
              }}
            >
              محادثة جديدة
            </Button>
          ) : undefined
        }
      />
      <div class="chat" aria-live="polite">
        <div class="bubble bubble--bot">أهلاً{v?.unit.owner_name ? ` يا ${v.unit.owner_name}` : ''}. اسألني عن حسابك أو مصاريف العمارة، أو قولي عايز صنايعي أو عندك عطل.</div>
        {msgs.length === 0 && (
          <div class="choice__row">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" class="choice__item" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} class={`bubble ${m.me ? 'bubble--me' : 'bubble--bot'}`}>
            <span class="sr-only">{m.me ? 'انت: ' : 'المساعد: '}</span>
            {m.text}
          </div>
        ))}
        {busy && <Loading text="المساعد بيكتب..." />}
        <ErrorMessage error={err} />
        <div ref={end} />
      </div>
      <form
        class="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <label class="sr-only" for="chat-q">
          سؤالك
        </label>
        <textarea id="chat-q" class="field__input" rows={1} value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="اكتب سؤالك..." />
        <Button type="submit" icon="send" disabled={busy || !text.trim()}>
          ابعت
        </Button>
      </form>
    </>
  );
}

/* ================= كود الشقة ================= */

function Account() {
  const { resident: v } = useAppState();
  if (!v) return <CardSkeleton />;
  const link = residentLink(v.pay_code);
  return (
    <>
      <PageHeader title="كود شقتي" back="#r/more" subtitle="أي حد في البيت يقدر يدخل بالكود ده يشوف الحساب ويدفع." />
      <Card>
        <span class="muted">كود الدفع</span>
        <div class="code-box">{v.pay_code}</div>
        <div style={{ width: '180px', alignSelf: 'center' }}>
          <Qr text={link} label={`كود QR لدخول شقة ${v.unit.unit}`} />
        </div>
        <ShareBox text={`لينك حساب شقة ${v.unit.unit} في ${buildingName(v.building)} على تطبيق عمارتنا:\n${link}`} title="ابعته لحد في البيت" show={false} />
      </Card>
    </>
  );
}

/* ================= ادعي عمارة ================= */

export function Invite({ back }: { back: string }) {
  const url = `${appUrl()}#register`;
  const text = `بنستخدم تطبيق عمارتنا لحساب العمارة: الاشتراكات والمصاريف بالإيصالات وبلاغات الأعطال، كله من الموبايل. سجّل عمارتك من هنا:\n${url}`;
  return (
    <>
      <PageHeader title="عمارة صاحبك محتاجة التطبيق؟" back={back} />
      <Card>
        <p>ابعت اللينك ده لأمين صندوق أو ساكن في عمارة تانية، ويقدر يسجّل عمارته في دقايق.</p>
        <ShareBox text={text} />
      </Card>
    </>
  );
}
