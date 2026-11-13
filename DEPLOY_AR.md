# Field Shift — GitHub Pages + NASA POWER مباشر

## كيف ننشر؟
ينشر `.github/workflows/pages.yml` المجلد `public/` من فرع `main` إلى:
https://rakan005.github.io/Adapting-Forms-with-Nasa-Data/

## NASA POWER Live على GitHub Pages
عند اختيار Live أو زر «حلّل ببيانات NASA مباشرة»، يستخدم `public/browser-live.js` طلب HTTPS مباشرًا من المتصفح إلى NASA POWER Daily Point API حسب الإحداثيات.

- الفترة الحالية: 2020–2024 (مناخ تاريخي إقليمي، **ليس توقعًا** أو طقسًا لحظيًا).
- يتم فحص اكتمال بيانات الحرارة والهطول الفعلية قبل عرض نتيجة.
- نفس محرك `public/core.js` يحسب MCDA وMonte Carlo، ويستعمل خصائص محاصيل افتراضية موثقة.
- يحفظ المتصفح استجابات NASA الناجحة بذاكرة الجلسة حتى لا يعيد الطلب عند تحريك الأوزان.
- إذا فشل الاتصال أو CORS أو اكتمال البيانات يظهر خطأ، **من دون بديل Synthetic مخفي**.
- Synthetic Demo وضع منفصل للتجربة ولا يمثل بيانات NASA.
- MODIS NDVI وSoilGrids غير محمّلين تلقائيًا في وضع GitHub Pages Live، ولا يجوز الادعاء بخلاف ذلك. يمكن إدخال قيمة SOC من مختبر كإدخال مستخدم غير متحقق منه.

## اختبار الموقع
1. افتح رابط Pages من الكمبيوتر أو الهاتف.
2. اختر Live؛ تأكد من ظهور حالة NASA POWER = loaded ووقت جلب ورابط المصدر.
3. افحص Network بالمتصفح؛ يجب رؤية طلب `https://power.larc.nasa.gov/api/temporal/daily/point`.
4. إن منع CORS الوصول، ستظهر رسالة فشل. وجود CI ناجح **لا يؤكد** الوصول الحقيقي من المتصفح.
5. جرّب Synthetic Demo وتأكد من وجود وسم Synthetic وعدم اختلاطه بالبيانات الحقيقية.

## Backend اختياري
لا تحتاج Render لتشغيل جلب POWER المباشر من المتصفح. إذا رغبت باستخدام `/api/evaluate` أو كاش السيرفر أو ملفات MODIS/SoilGrids اختيارية، شغّل Node.js 22.16+ باستخدام `npm start` في استضافة منفصلة.

المصادر:
- https://power.larc.nasa.gov/docs/services/api/
- https://modis.ornl.gov/data/modis_webservice.html

النتائج استكشافية، وليست توصيات زراعية معتمدة، وخصائص المحاصيل تحتاج معايرة محلية.
