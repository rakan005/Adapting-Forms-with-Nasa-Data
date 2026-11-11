import { Card, Link } from './pageShared'

function NotFoundPage(){return <div className="grid min-h-[65vh] place-items-center"><Card className="text-center"><p className="text-6xl font-black text-forest-600">404</p><h1 className="mt-3 text-2xl font-extrabold">الصفحة غير موجودة</h1><Link className="btn-primary mt-5" to="/">العودة للرئيسية</Link></Card></div>}

export default NotFoundPage
