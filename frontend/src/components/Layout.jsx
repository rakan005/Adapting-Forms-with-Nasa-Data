import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
export default function Layout(){return <div className="min-h-screen"><Navbar/><main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8"><Outlet/></main><footer className="mx-auto max-w-[1500px] px-6 pb-8 text-center text-xs text-slate-400">المستشار الزراعي الذكي · بيانات توضيحية إلى حين ربط مجموعة بيانات NASA المعتمدة</footer></div>}
