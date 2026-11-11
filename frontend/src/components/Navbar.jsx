import { NavLink, useNavigate } from 'react-router-dom'
import { Sprout, LayoutDashboard, MapPinned, ClipboardList, Bot, Bell, CreditCard, Sun, Moon, LogOut, Menu, X, RotateCcw, History } from 'lucide-react'
import { useState } from 'react'
import useAuth from '../hooks/useAuth'

const links = [
  ['الرئيسية', '/', 'LayoutDashboard'],
  ['مزارعي', '/farms', 'MapPinned'],
  ['تحليل الأرض', '/advice', 'ClipboardList'],
  ['القرارات', '/decisions', 'History'],
  ['الدورة الزراعية', '/seasons', 'RotateCcw'],
  ['المساعد الذكي', '/assistant', 'Bot'],
  ['التنبيهات', '/alerts', 'Bell'],
  ['الاشتراك', '/subscription', 'CreditCard'],
]

const icons = { LayoutDashboard, MapPinned, ClipboardList, RotateCcw, Bot, Bell, CreditCard, History }

function NavItems({ onNavigate }) {
  return links.map(([label, to, icon]) => {
    const Icon = icons[icon]
    return (
      <NavLink
        onClick={onNavigate}
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-emerald-600 text-white' : 'text-emerald-50/80 hover:bg-white/10'}`}
      >
        <Icon size={17} />{label}
      </NavLink>
    )
  })
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'))
  const nav = useNavigate()

  const toggle = () => {
    document.documentElement.classList.toggle('dark')
    setDark(!dark)
    localStorage.setItem('crop-advisor-theme', !dark ? 'dark' : 'light')
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-[#10261e] text-white shadow-lg">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="القائمة">
          {open ? <X /> : <Menu />}
        </button>
        <button onClick={() => nav('/')} className="flex items-center gap-3 text-right">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300"><Sprout size={27} /></span>
          <span><b className="block text-base sm:text-lg">المستشار الزراعي الذكي</b><small className="hidden text-emerald-100/70 sm:block">قرارات زراعية أوضح</small></span>
        </button>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="التنقل الرئيسي"><NavItems /></nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button onClick={toggle} className="rounded-xl p-2 hover:bg-white/10" title="تبديل المظهر" aria-label="تبديل المظهر">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
          {user ? <>
            <span className="hidden max-w-36 truncate text-sm text-emerald-50 md:block">{user.fullName}</span>
            <button onClick={logout} className="rounded-xl p-2 text-emerald-50/80 hover:bg-white/10" title="تسجيل الخروج" aria-label="تسجيل الخروج"><LogOut size={18} /></button>
          </> : <>
            <button onClick={() => nav('/login')} className="rounded-xl px-3 py-2 text-sm font-bold text-emerald-50 hover:bg-white/10">دخول</button>
            <button onClick={() => nav('/register')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold hover:bg-emerald-500">إنشاء حساب</button>
          </>}
        </div>
      </div>
      {open && <nav className="grid gap-1 border-t border-white/10 p-3 xl:hidden" aria-label="التنقل على الهاتف"><NavItems onNavigate={() => setOpen(false)} /></nav>}
    </header>
  )
}
