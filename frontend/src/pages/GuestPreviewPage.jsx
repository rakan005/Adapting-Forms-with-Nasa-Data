import { Leaf, Link, LockKeyhole, cardClass, featureLinks, pageContent, useLocation } from './publicShared'

function GuestPreviewPage() {
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

export default GuestPreviewPage
