import { Card } from '../components/Card';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/Page';

const FEATURES: [IconName, string, string][] = [
  ['camera', 'الإيصال بيتقرا لوحده', 'الساكن يصوّر تحويل إنستاباي، والمبلغ ورقم العملية بيتكتبوا لوحدهم. وأمين الصندوق يوافق بضغطة.'],
  ['receipt', 'دفتر مصاريف ما بيتعدّلش', 'كل مصروف بإيصاله وظاهر لكل السكان. أي غلط بيتصلح بقيد تصحيح فيه السبب، والقديم ما بيتمسحش.'],
  ['send', 'تذكير المتأخرين على واتساب', 'رسالة مهذبة جاهزة لكل شقة متأخرة، فيها المبلغ والشهور ولينك الدفع.'],
  ['shield', 'بيحمي الاتحاد', 'كشف حساب وتقرير PDF جاهزين للجمعية العمومية والملاك، وكل جنيه ليه إيصال.'],
  ['tools', 'صنايعية NRG', 'سبّاك أو كهربائي أو نجّار للشقة بسعر واضح قبل الشغل.'],
  ['qr', 'زوار وأمن', 'الساكن يعمل تصريح للزائر، والبواب يتأكد من الكود على البوابة.'],
  ['chat', 'مساعد بالعامية', 'الساكن يسأل "عليا كام؟" أو "الفلوس اتصرفت على إيه؟" وياخد رد على طول.'],
  ['calendar', 'تقسيط وصيانة دورية', 'قسّط المتأخر على شهور، والتطبيق يفكّرك بميعاد تنظيف الخزان وصيانة الأسانسير.']
];

export function About() {
  return (
    <main class="screen">
      <PageHeader title="عمارتنا" back="#login" subtitle="التطبيق اللي بيحصّل فلوس العمارة، كاش أو أونلاين، وبيحمي الاتحاد قانونياً." />
      <a class="btn btn--primary btn--block" href="#register">
        <Icon name="plus" size={20} />
        <span>سجّل عمارتك</span>
      </a>
      <Card title="بيبدأ إزاي؟">
        <ol class="stack" style={{ margin: 0, paddingInlineStart: '20px', gap: '8px' }}>
          <li>أمين الصندوق يسجّل العمارة والشقق في دقايق.</li>
          <li>يطبع كروت الأكواد ويوزّعها، أو يبعت لكل شقة لينكها على واتساب.</li>
          <li>السكان يدخلوا بالكود من غير تسجيل ولا باسورد، ويشوفوا عليهم كام ويدفعوا.</li>
        </ol>
      </Card>
      <div class="stack">
        {FEATURES.map(([icon, title, body]) => (
          <div key={title} class="card" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--primary)', flex: 'none', marginTop: '2px' }}>
              <Icon name={icon} size={26} />
            </span>
            <div class="stack" style={{ gap: '4px' }}>
              <strong>{title}</strong>
              <span class="muted">{body}</span>
            </div>
          </div>
        ))}
      </div>
      <Card>
        <strong>كل ساكن بيشوف شقته بس</strong>
        <span class="muted">الساكن بيدخل بكود شقته، وما بيشوفش حسابات الشقق التانية. اللي بيشوفه الكل هو مصاريف العمارة ورصيد الصندوق.</span>
      </Card>
      <a class="btn btn--primary btn--block" href="#register">
        سجّل عمارتك
      </a>
    </main>
  );
}
