import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Bot,
  CloudSun,
  Layers3,
  Leaf,
  LockKeyhole,
  MapPinned,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Wheat,
} from 'lucide-react'

const cardClass = 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900'

const featureLinks = [
  { to: '/farms', title: 'إدارة المزارع', text: 'سجّل موقع الأرض ومساحتها وخصائصها.', icon: MapPinned },
  { to: '/advice', title: 'تحليل الأرض', text: 'افهم أثر الطقس والتربة على اختيار المحاصيل.', icon: BarChart3 },
  { to: '/seasons', title: 'الدورة الزراعية', text: 'خطّط للمواسم وسجّل المحاصيل بالتتابع.', icon: RotateCcw },
  { to: '/assistant', title: 'المساعد الزراعي', text: 'اسأل ورتّب ملاحظاتك الزراعية.', icon: Bot },
]

export function PublicHomePage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#10261e] via-[#174d32] to-[#27834a] px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -left-12 -top-16 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-emerald-100">
              <Sprout size={16} /> منصة القرار الزراعي الذكي
            </div>
            <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
              خطّط لمزرعتك بوضوح، موسمًا بعد موسم
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-emerald-50/85 sm:text-lg">
              استكشف أدوات تحليل الأرض وتوصية المحاصيل والدورة الزراعية. تصفّح الموقع كزائر، وسجّل الدخول عندما تريد فتح بيانات مزارعك الخاصة.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-forest-800 transition hover:bg-emerald-50" to="/register">
                أنشئ حساب مزارع <ArrowLeft size={17} />
              </Link>
              <Link className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10" to="/advice">
                استكشف المنصة
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureSnapshot icon={CloudSun} title="مؤشرات المناخ" text="الحرارة والأمطار وبيانات الموقع المتاحة" />
            <FeatureSnapshot icon={Layers3} title="خصائص التربة" text="الملوحة والتغطية بحسب البيانات المتوفرة" />
            <FeatureSnapshot icon={Wheat} title="ملاءمة المحاصيل" text="أسباب الاختيار والتحذيرات ومستوى الثقة" />
            <FeatureSnapshot icon={ShieldCheck} title="بياناتك خاصة" text="مزارعك وسجلاتك لا تظهر إلا بعد الدخول" />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-forest-600">تصفّح كزائر</p>
            <h2 className="mt-1 text-2xl font-extrabold">استكشف أقسام المنصة</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">لن نعرض بيانات شخصية قبل تسجيل الدخول.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featureLinks.map(({ to, title, text, icon: Icon }) => (
            <Link key={to} to={to} className={`${cardClass} group transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg`}>
              <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-forest-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Icon size={21} /></span>
              <h3 className="font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-forest-700 dark:text-emerald-300">استكشف <ArrowLeft size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${cardClass} grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-forest-600">كيف تبدأ؟</p>
          <h2 className="mt-1 text-xl font-extrabold">أنشئ حسابك لتظهر لك بياناتك الشخصية</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            بعد تسجيل الدخول، أضف مزرعتك وموقعها ومساحتها. بعدها ستجد تحليلات أرضك وتوصياتها وسجل قراراتك ومواسمك في لوحة خاصة بك.
          </p>
          <p className="mt-3 text-xs text-slate-400">بيانات المناخ والمحاصيل في النسخة الحالية قد تكون تجريبية إلى حين ربط مجموعة NASA المعتمدة.</p>
        </div>
        <Link className="btn-primary whitespace-nowrap" to="/register">ابدأ الآن</Link>
      </section>
    </div>
  )
}

function FeatureSnapshot({ icon: Icon, title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
      <Icon className="mb-3 text-emerald-200" size={22} />
      <h2 className="font-extrabold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-emerald-50/75">{text}</p>
    </div>
  )
}

const pageContent = [
  { match: path => path === '/farms' || path === '/farms/new' || /^\/farms\/[^/]+$/.test(path), title: 'إدارة المزارع', subtitle: 'لكل مزارع مساحة خاصة ببيانات أرضه.', icon: MapPinned, description: 'بعد تسجيل الدخول، أضف مزارعك وحدد الموقع والمساحة وخصائص التربة. تبقى تفاصيل الأراضي غير معروضة للزوار.', bullets: ['تحديد الموقع على الخريطة', 'تسجيل مساحة الأرض بالدونم', 'حفظ خصائص التربة والمحصول السابق'] },
  { match: path => path.includes('/advice') || path === '/advice', title: 'تحليل الأرض وتوصيات المحاصيل', subtitle: 'شاهد كيف تساعدك المنصة في اتخاذ القرار.', icon: BarChart3, description: 'يربط التحليل بين موقع مزرعتك والبيانات المناخية وخصائص التربة، ثم يوضح ملاءمة المحاصيل وأسباب التوصية والتحذيرات.', bullets: ['مؤشرات المناخ والتربة المتاحة', 'مستوى التغطية والثقة', 'أسباب التوصية واستبعاد المحاصيل'] },
  { match: path => path.includes('/decisions') || path === '/decisions', title: 'سجل القرارات', subtitle: 'قراراتك الزراعية محفوظة ضمن حسابك.', icon: Wheat, description: 'بعد الدخول، راجع التوصيات التي طلبتها لكل مزرعة، وتابع ما اعتمدته أو أجّلته.', bullets: ['التصفية حسب المزرعة', 'متابعة الإجراء على التوصية', 'فتح التقرير وطباعته'] },
  { match: path => path === '/seasons', title: 'الدورة الزراعية وسجل المواسم', subtitle: 'خطّط للمواسم ووثّق ما زرعته.', icon: RotateCcw, description: 'تساعدك هذه الصفحة على الاحتفاظ بسجل المواسم والمحاصيل لكل مزرعة. بيانات السجل خاصة بصاحب الحساب.', bullets: ['ربط الموسم بالمزرعة', 'تسجيل المحصول وتاريخ الزراعة', 'الرجوع إلى المواسم السابقة'] },
  { match: path => path === '/assistant', title: 'المساعد الزراعي', subtitle: 'مساعدك في الأسئلة وتنظيم ملاحظات المزرعة.', icon: Bot, description: 'يمكن للمساعد الإجابة عن أسئلتك الزراعية وتنظيم وصف الأرض إلى بيانات تراجعها قبل حفظها.', bullets: ['محادثة حول توصياتك', 'تنظيم وصف الأرض إلى مسودة', 'اختيار مزرعة كسياق للمحادثة'] },
  { match: path => path === '/alerts', title: 'التنبيهات الزراعية', subtitle: 'تابع التنبيهات المرتبطة بمزارعك.', icon: Bell, description: 'بعد الدخول، تظهر تنبيهات حسابك وتفضيلاتك. لا نعرض تنبيهات خاصة بمزارع مستخدمين آخرين.', bullets: ['عرض التنبيهات النشطة', 'تعديل تفضيلات التنبيه', 'ربط التنبيه بسياق المزرعة'] },
  { match: path => path === '/subscription', title: 'الاشتراك والخطط', subtitle: 'إدارة خطتك بعد تسجيل الدخول.', icon: ShieldCheck, description: 'يمكنك استكشاف هذا القسم كزائر. تفاصيل خطتك الحالية وتغييرها محفوظة لحسابك بعد تسجيل الدخول.', bullets: ['عرض الخطة الحالية', 'مقارنة حدود الاستخدام', 'إدارة اشتراك الحساب'] },
  { match: path => path.startsWith('/reports/'), title: 'تقرير التوصية', subtitle: 'التقرير مرتبط بقرار خاص بحسابك.', icon: LockKeyhole, description: 'سجّل الدخول لعرض التقرير أو طباعته. لن تظهر تفاصيل القرار من رابط عام.', bullets: ['ملخص التوصية', 'مؤشرات المناخ والتحذيرات', 'طباعة التقرير بصيغة PDF'] },
]

export function GuestPreviewPage() {
  const { pathname } = useLocation()
  const content = pageContent.find(item => item.match(pathname)) || {
    title: 'استكشف المنصة الزراعية',
    subtitle: 'تصفّح الأقسام العامة قبل إنشاء حسابك.',
    icon: Leaf,
    description: 'يمكنك استكشاف طريقة عمل أدوات المنصة. سجّل الدخول لعرض البيانات الشخصية أو تنفيذ الإجراءات على مزارعك.',
    bullets: ['معلومات عامة عن الأدوات', 'معاينة طريقة العمل', 'بياناتك الخاصة بعد تسجيل الدخول'],
  }
  const Icon = content.icon

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-bl from-emerald-50 to-white p-6 dark:from-emerald-950/40 dark:to-slate-900 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-forest-600 dark:text-emerald-300">معاينة عامة</p>
            <h1 className="mt-2 text-3xl font-black">{content.title}</h1>
            <p className="mt-2 text-lg font-semibold text-slate-600 dark:text-slate-300">{content.subtitle}</p>
            <p className="mt-4 leading-8 text-slate-600 dark:text-slate-400">{content.description}</p>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-forest-700 dark:bg-emerald-900/60 dark:text-emerald-300"><Icon size={27} /></span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className={cardClass}>
          <h2 className="text-lg font-extrabold">ماذا ستجد في هذا القسم؟</h2>
          <ul className="mt-4 space-y-3">
            {content.bullets.map(text => <li key={text} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-forest-700 dark:bg-emerald-900/60 dark:text-emerald-300"><Leaf size={15} /></span>{text}</li>)}
          </ul>
        </section>

        <aside className={`${cardClass} border-emerald-200 dark:border-emerald-900`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-forest-700 dark:bg-emerald-950/60 dark:text-emerald-300"><LockKeyhole size={19} /></span>
          <h2 className="mt-4 text-lg font-extrabold">بياناتك تبقى خاصة</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">المزارع والقرارات والسجلات لا تظهر إلا بعد تسجيل الدخول إلى حسابك.</p>
          <div className="mt-5 grid gap-2">
            <Link className="btn-primary w-full" to="/login">تسجيل الدخول</Link>
            <Link className="btn-secondary w-full" to="/register">إنشاء حساب جديد</Link>
          </div>
        </aside>
      </div>

      <nav aria-label="أقسام عامة" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {featureLinks.map(({ to, title, icon: FeatureIcon }) => <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold transition hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"><FeatureIcon size={18} className="text-forest-600 dark:text-emerald-300" />{title}</Link>)}
      </nav>
    </div>
  )
}
