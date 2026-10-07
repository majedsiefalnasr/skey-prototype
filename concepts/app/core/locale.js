// Shared locale facility — extracted verbatim from the single-file legacy
// application script (concepts/app/legacy-app.js). Owns the Arabic
// translation dictionary, the encodeHtml() sanitizer, and date/currency
// formatting exactly as they behaved in the monolith; nothing here changes
// existing dictionary entries or formatting math.
//
// createLocale() returns {t, formatDate, formatCurrency, getLocale,
// setLocale, subscribe} per the plan's stated contract. subscribe(callback)
// returns an unsubscribe function; callbacks fire after setLocale() changes
// the active locale so callers (e.g. legacy-app.js's applyLocale, which
// still owns page/DOM re-rendering) can react.
//
// encodeHtml is also exported standalone (not part of the locale instance)
// for safe rendering elsewhere, per the plan.

// Language catalog behind the language selector (avatar menu → Language,
// and the Profile → Account settings → Language row). The selector lists
// every entry as an endonym + ISO code so it demonstrates the scalable
// many-locale pattern, but only EN/AR are wired to applyLocale() in
// shell/locale.js — the remaining entries are prototype/demo options:
// selecting one updates the selector's own display state only and never
// touches the application language, direction, or content. The functional
// selection persists in localStorage under LANGUAGE_STORAGE_KEY; demo
// selections are never persisted.
export const LANGUAGES = [
  {code: 'en', name: 'English', iso: 'EN'},
  {code: 'ar', name: 'العربية', iso: 'AR'},
  {code: 'fr', name: 'Français', iso: 'FR'},
  {code: 'de', name: 'Deutsch', iso: 'DE'},
  {code: 'es', name: 'Español', iso: 'ES'},
  {code: 'pt', name: 'Português', iso: 'PT'},
  {code: 'ja', name: '日本語', iso: 'JA'},
]

const FUNCTIONAL_LANGUAGE_CODES = new Set(['en', 'ar'])

export const isFunctionalLanguage = code => FUNCTIONAL_LANGUAGE_CODES.has(code)

export const LANGUAGE_STORAGE_KEY = 'skey-proto-language'

export function createLocale() {
        let appLocale = 'en'
        const I18N = {
          // Customer record
          Customer: 'العميل',
          'Customer No.': 'رقم العميل',
          'Customer Name': 'اسم العميل',
          'Operation Unit': 'وحدة التشغيل',
          'Customer Type': 'نوع العميل',
          'Prime Customer': 'العميل الرئيسي',
          'Acc. Code': 'رمز الحساب',
          'Customer Group': 'مجموعة العملاء',
          'Linked To Beneficiaries': 'مرتبط بالمستفيدين',
          Currency: 'العملة',
          'Customer Photo': 'صورة العميل',
          'Main Data': 'البيانات الرئيسية',
          Salesperson: 'مندوب المبيعات',
          'Driver No.': 'رقم السائق',
          'Geo. Location': 'الموقع الجغرافي',
          Collector: 'المحصل',
          'Marketer No.': 'رقم المسوق',
          'Credit Period': 'فترة الائتمان',
          'Tax Scope': 'نطاق الضريبة',
          'Tax Category': 'فئة الضريبة',
          'Method Show Price': 'طريقة عرض السعر',
          'Tax Number': 'الرقم الضريبي',
          'Permanent Account Number': 'رقم الحساب الدائم',
          'Program No': 'رقم البرنامج',
          'Activation Date': 'تاريخ التفعيل',
          'Customer Barcode': 'باركود العميل',
          Deactivate: 'إلغاء التفعيل',
          Activate: 'تفعيل',
          Active: 'نشط',
          Inactive: 'غير نشط',
          Modify: 'تعديل',
          Save: 'حفظ',
          Undo: 'تراجع',
          // Sales Invoice record
          'Sales Invoice': 'فاتورة المبيعات',
          General: 'عام',
          Year: 'السنة',
          'Doc Sub-Type': 'النوع الفرعي للمستند',
          Sequence: 'التسلسل',
          'Doc No.': 'رقم المستند',
          'Doc Date': 'تاريخ المستند',
          'WH No.': 'رقم المخزن',
          'Mobile No.': 'رقم الجوال',
          Address: 'العنوان',
          'Beneficiary No.': 'رقم المستفيد',
          'Exchange Rate': 'سعر الصرف',
          'Pricing Level': 'مستوى التسعير',
          Items: 'الأصناف',
          'Add item': 'إضافة صنف',
          Item: 'الصنف',
          UoM: 'الوحدة',
          'Expiry Date': 'تاريخ الانتهاء',
          'Batch No.': 'رقم الدفعة',
          'Qty.': 'الكمية',
          'Free Qty': 'كمية مجانية',
          'Available Qty': 'الكمية المتاحة',
          Price: 'السعر',
          'Discount %': 'نسبة الخصم',
          'Tax %': 'نسبة الضريبة',
          'Tax Amt': 'قيمة الضريبة',
          Total: 'الإجمالي',
          'Total Qty.': 'إجمالي الكمية',
          'Invoice charges': 'مصاريف الفاتورة',
          'Invoice summary': 'ملخص الفاتورة',
          'Items subtotal': 'إجمالي الأصناف',
          'required field needs attention': 'حقل مطلوب يحتاج إلى مراجعة',
          'required fields need attention': 'حقول مطلوبة تحتاج إلى مراجعة',
          'Item is required.': 'الصنف مطلوب.',
          'Quantity is required.': 'الكمية مطلوبة.',
          // Navigation
          Home: 'الرئيسية',
          Customers: 'العملاء',
          All: 'الكل',
          New: 'جديد',
          // Shell chrome / navigation
          Manage: 'إدارة',
          Add: 'إضافة',
          'Add Customer': 'إضافة عميل',
          'Add Location': 'إضافة موقع',
          'Geographical Structure': 'الهيكل الجغرافي',
          Search: 'بحث',
          'Search or run an action': 'ابحث أو نفّذ إجراءً',
          'Welcome back.': 'مرحباً بعودتك.',
          'Good to see you,': 'سعدنا برؤيتك،',
          'Resume recent work or open another Skey app.':
            'تابع عملك الأخير أو افتح تطبيقاً آخر من Skey.',
          'Switch app': 'تبديل التطبيق',
          'Choose another app or return to your current screen.':
            'اختر تطبيقاً آخر أو عُد إلى شاشتك الحالية.',
          'Search apps and screens': 'ابحث في التطبيقات والشاشات',
          'Back to current screen': 'العودة إلى الشاشة الحالية',
          'Current app': 'التطبيق الحالي',
          More: 'المزيد',
          'View all starred': 'عرض كل المفضلة',
          'View all recent': 'عرض كل الأخيرة',
          'Overview and key activity': 'نظرة عامة وأهم الأنشطة',
          'Customer accounts and profiles': 'حسابات العملاء وملفاتهم',
          'Supplier accounts and profiles': 'حسابات الموردين وملفاتهم',
          'Stock, warehouses, and items': 'المخزون والمستودعات والأصناف',
          'Orders, invoices, and sales': 'الطلبات والفواتير والمبيعات',
          'Purchasing and supplier documents': 'المشتريات ومستندات الموردين',
          'Point-of-sale operations': 'عمليات نقاط البيع',
          'Ledgers, journals, and finance': 'دفاتر الأستاذ والقيود والحسابات',
          'Assets, depreciation, and custody': 'الأصول والإهلاك والعهد',
          'Production, materials, and planning': 'الإنتاج والمواد والتخطيط',
          'Leads, activities, and relationships': 'العملاء المحتملون والأنشطة والعلاقات',
          'Healthcare operations and records': 'العمليات والسجلات الصحية',
          'Operational and financial reports': 'التقارير التشغيلية والمالية',
          'Users, roles, and permissions': 'المستخدمون والأدوار والصلاحيات',
          'Organization and system configuration': 'إعدادات المؤسسة والنظام',
          'Guides and product assistance': 'الأدلة ومساعدة المنتج',
          Starred: 'المفضلة',
          Recent: 'الأخيرة',
          Apps: 'التطبيقات',
          Favorites: 'المفضلة',
          'For You': 'لك',
          Record: 'السجل',
          Procedure: 'الإجراء',
          More: 'المزيد',
          Delete: 'حذف',
          'Add From': 'إضافة من',
          'Open in new tab': 'فتح في تبويب جديد',
          'Lock Screen': 'قفل الشاشة',
          Reports: 'التقارير',
          Print: 'طباعة',
          'Screen Parameters': 'إعدادات الشاشة',
          Help: 'مساعدة',
          'Accounts Movement': 'حركة الحسابات',
          'New Customer': 'عميل جديد',
          'New Location': 'موقع جديد',
          'Saved customer. Choose Modify to edit.': 'تم حفظ العميل. اختر تعديل للتحرير.',
          'New customer. Save when complete.': 'عميل جديد. احفظ عند الانتهاء.',
          'Editing customer. Save or Undo your changes.':
            'جارٍ تعديل العميل. احفظ أو تراجع عن التغييرات.',
          'Saved location. Choose Modify to edit.': 'تم حفظ الموقع. اختر تعديل للتحرير.',
          'New location. Save when complete.': 'موقع جديد. احفظ عند الانتهاء.',
          'Editing location. Save or Undo your changes.':
            'جارٍ تعديل الموقع. احفظ أو تراجع عن التغييرات.',
          'Not saved yet — this invoice takes its number and its place in the list when you save':
            'لم يُحفظ بعد — تأخذ الفاتورة رقمها ومكانها في القائمة عند الحفظ',
          'Customer Statement': 'كشف حساب العميل',
          'Add Contact': 'إضافة جهة اتصال',
          // Topbar chrome / help menu / user menu / language selector
          'AI Assistant': 'مساعد الذكاء الاصطناعي',
          Alerts: 'التنبيهات',
          'System Alerts': 'تنبيهات النظام',
          'Collapse sidebar': 'طي الشريط الجانبي',
          'Expand sidebar': 'توسيع الشريط الجانبي',
          'Show context panel': 'إظهار لوحة السياق',
          'Hide context panel': 'إخفاء لوحة السياق',
          "What's new": 'ما الجديد',
          'Take a tour': 'جولة تعريفية',
          Documentation: 'التوثيق',
          'Keyboard shortcuts': 'اختصارات لوحة المفاتيح',
          Support: 'الدعم',
          'Give feedback': 'إرسال ملاحظات',
          Information: 'معلومات',
          'About Skey ERP': 'عن نظام Skey ERP',
          'System status': 'حالة النظام',
          Legal: 'قانوني',
          'Terms of service': 'شروط الخدمة',
          'Privacy policy': 'سياسة الخصوصية',
          Personal: 'شخصي',
          Organization: 'المؤسسة',
          Back: 'رجوع',
          Done: 'تم',
          Dismiss: 'إغلاق',
          // Guided spotlight tour (T1 invoice-shell onboarding)
          'Move between records': 'التنقل بين السجلات',
          'Jump to any invoice without losing your place.':
            'انتقل إلى أي فاتورة دون أن تفقد مكانك.',
          'Track document status': 'تتبع حالة المستند',
          'Status is always named here, including Draft.':
            'الحالة ظاهرة هنا دائماً، بما فيها المسودة.',
          'Modify, then save': 'عدّل ثم احفظ',
          'Modify to edit, then Save or Undo your changes.':
            'عدّل للتحرير، ثم احفظ أو تراجع عن التغييرات.',
          // Invoice list tour
          'Search this list': 'ابحث في هذه القائمة',
          'Filter these invoices as you type.':
            'رشّح هذه الفواتير أثناء الكتابة.',
          'Open a record': 'افتح سجلاً',
          'Double-click a row — or its number — to open it.':
            'نقرة مزدوجة على أي صف — أو رقمه — لفتحه.',
          'Page through results': 'تنقل بين الصفحات',
          'Move across pages without losing filters.':
            'تنقل بين الصفحات دون فقدان الفلاتر.',
          // Profile tour
          'Jump between sections': 'تنقل بين الأقسام',
          'Profile, security, and sessions live here.':
            'الملف والأمان والجلسات هنا.',
          'Your details': 'بياناتك',
          'Keep your name and contact current.':
            'حافظ على تحديث اسمك وبيانات الاتصال.',
          'Prefer Arabic?': 'تفضل العربية؟',
          'Switch the whole app to العربية here.':
            'بدّل التطبيق كله إلى العربية من هنا.',
          // Organization tour
          'Switch admin areas': 'تنقل بين مناطق الإدارة',
          'Users, sessions, and audits live here.':
            'المستخدمون والجلسات والتدقيق هنا.',
          'Your access level': 'مستوى صلاحيتك',
          'Menus follow this role.': 'القوائم تتبع هذا الدور.',
          'Take action here': 'نفّذ إجراءً من هنا',
          'Open users, sessions, and health.':
            'افتح المستخدمين والجلسات والحالة.',
          // Launchpad tour
          'Find anything': 'اعثر على أي شيء',
          'Apps and screens are one search away.':
            'التطبيقات والشاشات على بعد بحث واحد.',
          'Open an app': 'افتح تطبيقاً',
          'Pick up where you left off.': 'تابع من حيث توقفت.',
          'Starred and recent': 'المفضلة والأخيرة',
          'Pin favorites for one-click return.':
            'ثبّت المفضلة للعودة بنقرة واحدة.',
          'No guided tour for this page yet':
            'لا توجد جولة تعريفية لهذه الصفحة بعد',
          'My Profile': 'ملفي الشخصي',
          'Account preferences': 'تفضيلات الحساب',
          Appearance: 'المظهر',
          Security: 'الأمان',
          'Sessions & devices': 'الجلسات والأجهزة',
          'Organization overview': 'نظرة عامة على المؤسسة',
          'Users & access': 'المستخدمون والصلاحيات',
          Workspace: 'مساحة العمل',
          'Customize sidebar': 'تخصيص الشريط الجانبي',
          'Add this page to Favorites': 'إضافة هذه الصفحة إلى المفضلة',
          Session: 'الجلسة',
          'Log out': 'تسجيل الخروج',
          'Add to Favorites': 'إضافة إلى المفضلة',
          'Remove from Favorites': 'إزالة من المفضلة',
          'Added to Favorites': 'أُضيفت إلى المفضلة',
          'Removed from Favorites': 'أُزيلت من المفضلة',
          'Not available on this page': 'غير متاح في هذه الصفحة',
          'Log out?': 'تسجيل الخروج؟',
          'You will be signed out of this session.': 'سيتم تسجيل خروجك من هذه الجلسة.',
          'Signed out': 'تم تسجيل الخروج',
          'Signed in as': 'مسجَّل الدخول باسم',
          'Workspace switched': 'تم تبديل مساحة العمل',
          Cancel: 'إلغاء',
          // Sign-in view (Slack-style minimal concept)
          'Sign in to your workspace': 'سجّل الدخول إلى مساحة عملك',
          'Enter your Skey tenant name': 'أدخل اسم مستأجر Skey الخاص بك',
          Continue: 'متابعة',
          'Tenant name': 'اسم المستأجر',
          'Find your workspaces': 'اعثر على مساحات عملك',
          'Do not know your tenant?': 'لا تعرف المستأجر؟',
          'Signing in from a branch device?': 'تسجّل الدخول من جهاز فرع؟',
          'Use device code': 'استخدم رمز الجهاز',
          'Enter your password to sign in': 'أدخل كلمة المرور لتسجيل الدخول',
          'Or choose another way to sign in.': 'أو اختر طريقة أخرى للدخول.',
          Change: 'تغيير',
          Password: 'كلمة المرور',
          Show: 'إظهار',
          Hide: 'إخفاء',
          'Caps Lock is on — passwords are case-sensitive.':
            'Caps Lock مفعّل — كلمات المرور حساسة لحالة الأحرف.',
          'Sign in with password': 'تسجيل الدخول بكلمة المرور',
          'OR SIGN IN WITH': 'أو سجّل الدخول عبر',
          'You land in Cairo HQ · 2026 — switchable after sign-in.':
            'ستدخل إلى القاهرة الرئيسية · 2026 — قابلة للتبديل بعد الدخول.',
          'Having trouble?': 'تواجه مشكلة؟',
          'Reset your password': 'أعد تعيين كلمة المرور',
          'New to Skey?': 'جديد على Skey؟',
          'Request access': 'طلب صلاحية',
          'Privacy & terms': 'الخصوصية والشروط',
          'Send reset link': 'أرسل رابط إعادة التعيين',
          'Back to sign in': 'العودة إلى تسجيل الدخول',
          'Enter your username and we will send a reset link to the address on file.':
            'أدخل اسم المستخدم وسنرسل رابط إعادة التعيين إلى العنوان المسجَّل.',
          'If an account exists for {user}, a reset link is on its way. (demo — no email is sent)':
            'إذا كان هناك حساب لـ {user} فسيصلك رابط إعادة التعيين قريباً. (تجريبي — لا تُرسل أي رسائل)',
          'Search by organization, email, or tenant name.':
            'ابحث باسم المؤسسة أو البريد أو اسم المستأجر.',
          'No workspaces found.': 'لا توجد مساحات عمل مطابقة.',
          'On another device, open skeyerp.com/activate and enter this code.':
            'على جهاز آخر، افتح skeyerp.com/activate وأدخل هذا الرمز.',
          'Waiting for approval': 'بانتظار الموافقة',
          'Simulate approval (demo)': 'محاكاة الموافقة (تجريبي)',
          'Device approved — signing you in…': 'تمت الموافقة على الجهاز — جارٍ تسجيل دخولك…',
          'Tell us who you are and we will provision a workspace for your team.':
            'أخبرنا عنك وسنجهّز مساحة عمل لفريقك.',
          'Full name': 'الاسم الكامل',
          'Work email': 'البريد الإلكتروني للعمل',
          'Request received — we will email {email} within one business day. (demo)':
            'تم استلام الطلب — سنراسل {email} خلال يوم عمل واحد. (تجريبي)',
          'Data processing': 'معالجة البيانات',
          'Skey processes customer, invoice, and employee data only to provide the services your organization subscribes to. Data stays in your selected region.':
            'تعالج Skey بيانات العملاء والفواتير والموظفين فقط لتقديم الخدمات التي تشترك فيها مؤسستك. وتبقى بياناتك في المنطقة التي اخترتها.',
          'TLS 1.3 in transit, AES-256 at rest, SSO and MFA support, and quarterly access reviews. Sessions time out after 30 minutes of inactivity.':
            'TLS 1.3 أثناء النقل، وAES-256 أثناء التخزين، ودعم لتسجيل الدخول الموحد والتحقق الثنائي، ومراجعات ربع سنوية للصلاحيات. تنتهي الجلسات بعد 30 دقيقة من عدم النشاط.',
          'Subprocessors': 'المعالجون من الأطراف الثالثة',
          'Cloud hosting in EU and Cairo regions, transactional email, and error monitoring — each under a data-processing agreement.':
            'استضافة سحابية في مناطق الاتحاد الأوروبي والقاهرة، وبريد المعاملات، ومراقبة الأخطاء — كلها ضمن اتفاقية معالجة بيانات.',
          'Your rights': 'حقوقك',
          'Export or delete your workspace data at any time from Organization → Data. Requests are honored within 30 days.':
            'صدّر بيانات مساحة عملك أو احذفها في أي وقت من المؤسسة ← البيانات. وتُلبَّى الطلبات خلال 30 يوماً.',
          'Help center': 'مركز المساعدة',
          Email: 'البريد الإلكتروني',
          Hours: 'ساعات العمل',
          'Sun–Thu · 9:00–18:00 Cairo': 'الأحد–الخميس · 9:00–18:00 بتوقيت القاهرة',
          'By continuing, you agree to the Skey subscription agreement and accept the terms of service.':
            'بالمتابعة أنت توافق على اتفاقية اشتراك Skey وتقبل شروط الخدمة.',
          'Single sign-on is not enabled in this demo.':
            'الدخول الموحد غير مفعّل في هذا العرض التجريبي.',
          'Invalid credentials in this demo — try admin / skey123.':
            'بيانات الدخول غير صحيحة في هذا العرض — جرّب admin / skey123.',
          // Round 2 — workspace search, branch step, PIN sign-in, save dialog
          'Press Enter to continue.': 'اضغط Enter للمتابعة.',
          'Which branch are you working from?': 'من أي فرع تعمل اليوم؟',
          "This workspace has more than one branch. Pick today's branch — you can switch after signing in.":
            'هذه المساحة لها أكثر من فرع. اختر فرع اليوم — يمكنك التبديل بعد تسجيل الدخول.',
          'Welcome back': 'مرحباً بعودتك',
          'You saved this sign-in — enter your 6-digit PIN to continue.':
            'لقد حفظت هذا الدخول — أدخل رمزك المكوّن من 6 أرقام للمتابعة.',
          PIN: 'الرمز السري',
          'Sign in with PIN': 'تسجيل الدخول بالرمز السري',
          'Use password instead': 'استخدم كلمة المرور بدلاً منه',
          'Incorrect PIN — try again, or use your password.':
            'رمز سري غير صحيح — حاول مجدداً، أو استخدم كلمة المرور.',
          'Save your sign-in?': 'هل تحفظ تسجيل دخولك؟',
          'Create a 6-digit PIN to sign in faster next time.':
            'أنشئ رمزاً سرياً من 6 أرقام لدخول أسرع في المرة القادمة.',
          'Signing in as': 'مسجَّل الدخول باسم',
          'Save this sign-in and next time a 6-digit PIN replaces your password on this device.':
            'احفظ هذا الدخول وسيحل الرمز السري المكوّن من 6 أرقام محل كلمة المرور على هذا الجهاز في المرة القادمة.',
          'Confirm PIN': 'تأكيد الرمز السري',
          'Six digits — you will use it instead of your password next time.':
            'ستة أرقام — ستستخدمه بدلاً من كلمة المرور في المرة القادمة.',
          'Not now': 'ليس الآن',
          'Create PIN': 'إنشاء رمز سري',
          'Create your PIN': 'أنشئ رمزك السري',
          'Save PIN': 'حفظ الرمز السري',
          'PIN must be exactly 6 digits.': 'يجب أن يتكون الرمز السري من 6 أرقام بالضبط.',
          'PINs do not match.': 'الرمزان السريان غير متطابقين.',
          'PIN created — sign in with your PIN next time.':
            'تم إنشاء الرمز السري — سجّل الدخول برمزك السري في المرة القادمة.',
          'Who’s signing in?': 'من سيُسجِّل الدخول؟',
          'Use another account': 'استخدام حساب آخر',
          'Forget this account': 'نسيان هذا الحساب',
          'Sign in as someone else': 'تسجيل الدخول كشخص آخر',
          'Use PIN instead': 'استخدم الرمز السري بدلاً منه',
          'Start over': 'البدء من جديد',
          'One more step': 'خطوة أخيرة',
          'Account removed from this device.': 'تمت إزالة الحساب من هذا الجهاز.',
          'Remove account': 'إزالة الحساب',
          'Signed in': 'تم تسجيل الدخول',
          Administrator: 'مسؤول',
          Manager: 'مدير',
          User: 'مستخدم',
          Language: 'اللغة',
          'Search screens, customers and invoices, or type an action':
            'ابحث في الشاشات والعملاء والفواتير، أو اكتب أمراً',
          Scope: 'النطاق',
          Everything: 'الكل',
          Screens: 'الشاشات',
          Records: 'السجلات',
          Actions: 'الإجراءات',
          Navigate: 'التنقل',
          Open: 'فتح',
          'Change scope': 'تغيير النطاق',
          'Actions apply to invoice 126': 'الإجراءات تنطبق على الفاتورة 126',
          'You are on': 'أنت الآن على',
          // Profile → Account settings (the profile half of the language selector)
          Username: 'اسم المستخدم',
          Branch: 'الفرع',
          'Default landing page': 'صفحة البداية الافتراضية',
          'Account settings': 'إعدادات الحساب',
          'Username, branch, language, and default landing page.':
            'اسم المستخدم والفرع واللغة وصفحة البداية الافتراضية.',
          // Sidebar "Account" rail group — the shell screens that are not apps
          Account: 'الحساب',
          Profile: 'الملف الشخصي',
          'Organization Center': 'مركز المؤسسة',
          // Data list toolbar / pagination / grouping
          'Clear all filters': 'إزالة كل الفلاتر',
          'Clear filter': 'إزالة الفلتر',
          Selected: 'المحدد',
          actions: 'إجراءات',
          selected: 'محدد',
          'Clear selection': 'إلغاء التحديد',
          Filters: 'الفلاتر',
          'Unsaved view': 'عرض غير محفوظ',
          'Advanced filters': 'فلاتر متقدمة',
          'Clear advanced filters': 'إزالة الفلاتر المتقدمة',
          Filter: 'فلتر',
          'Save filter': 'حفظ الفلتر',
          'table controls': 'عناصر التحكم بالجدول',
          'Save layout': 'حفظ التخطيط',
          'Clear search': 'مسح البحث',
          'Print list': 'طباعة القائمة',
          'Print record': 'طباعة السجل',
          Chart: 'رسم بياني',
          'X axis': 'المحور السيني',
          'Y axis': 'المحور الصادي',
          Count: 'العدد',
          'record navigation': 'التنقل بين السجلات',
          'Record navigation': 'التنقل بين السجلات',
          'First record': 'السجل الأول',
          'Previous record': 'السجل السابق',
          'Next record': 'السجل التالي',
          'Last record': 'السجل الأخير',
          'Record number': 'رقم السجل',
          Columns: 'الأعمدة',
          'Visible columns': 'الأعمدة الظاهرة',
          Display: 'عرض',
          'Choose a column to group by': 'اختر عمودًا للتجميع حسبه',
          'Group by': 'تجميع حسب',
          'Group by, or drag a column header here': 'تجميع حسب، أو اسحب عنوان عمود هنا',
          'Row groups': 'مجموعات الصفوف',
          'Reset grouping': 'إعادة تعيين التجميع',
          'Row grouping drop zone': 'منطقة إفلات تجميع الصفوف',
          'Drag a column header here to add another group': 'اسحب عنوان عمود هنا لإضافة تجميع آخر',
          grouping: 'التجميع',
          Today: 'اليوم',
          'This week': 'هذا الأسبوع',
          'This month': 'هذا الشهر',
          'This quarter': 'هذا الربع',
          'This year': 'هذا العام',
          Upcoming: 'القادم',
          'Specific date': 'تاريخ محدد',
          'Date range': 'نطاق تاريخ',
          'Choose date': 'اختر تاريخًا',
          Number: 'العدد',
          Unit: 'الوحدة',
          From: 'من',
          To: 'إلى',
          to: 'إلى',
          'Day(s)': 'يوم/أيام',
          'Week(s)': 'أسبوع/أسابيع',
          'Month(s)': 'شهر/أشهر',
          'Year(s)': 'سنة/سنوات',
          Clear: 'مسح',
          Remove: 'إزالة',
          'Drag to reorder': 'اسحب لإعادة الترتيب',
          'Drag to reorder or add to row groups':
            'اسحب لإعادة الترتيب أو الإضافة إلى مجموعات الصفوف',
          'filter value': 'قيمة الفلتر',
          Enter: 'أدخل',
          'Choose value': 'اختر قيمة',
          filter: 'فلتر',
          Page: 'صفحة',
          'page navigation': 'التنقل بين الصفحات',
          Showing: 'عرض',
          of: 'من',
          'First page': 'الصفحة الأولى',
          'Last page': 'الصفحة الأخيرة',
          Previous: 'السابق',
          Next: 'التالي',
          'Rows per page': 'صفوف لكل صفحة',
          'Go to page': 'الانتقال إلى صفحة',
          matching: 'مطابقة لـ',
          'No record at this position.': 'لا يوجد سجل في هذا الموضع.',
          'No records match this view.': 'لا توجد سجلات مطابقة لهذا العرض.',
          'Try First or Last.': 'جرّب الأول أو الأخير.',
          'Clear the search or filter to see records again.':
            'امسح البحث أو الفلتر لرؤية السجلات مجددًا.',
          'Tip: Alt + Left/Right arrow also moves between records':
            'تلميح: يمكنك أيضًا استخدام Alt + السهم الأيمن/الأيسر للتنقل بين السجلات',
          fields: 'حقول',
          'Sort ascending': 'ترتيب تصاعدي',
          'Sort descending': 'ترتيب تنازلي',
          'Clear sort': 'إزالة الترتيب',
          'Pin column': 'تثبيت العمود',
          'Unpin column': 'إلغاء تثبيت العمود',
          'Hide column': 'إخفاء العمود',
          'Group by this column': 'تجميع حسب هذا العمود',
          'Chart range': 'نطاق الرسم البياني',
          'All available filters are applied.': 'تم تطبيق جميع الفلاتر المتاحة.',
          // List/cards/kanban view names
          List: 'قائمة',
          Cards: 'بطاقات',
          Kanban: 'كانبان',
          Compact: 'مضغوط',
          Adaptive: 'متكيف',
          'List view': 'عرض القائمة',
          'Compact view': 'عرض مضغوط',
          'Adaptive view': 'عرض متكيف',
          'Cards view': 'عرض البطاقات',
          'Kanban view': 'عرض كانبان',
          // Data list columns
          'Doc. Sequence': 'تسلسل المستند',
          'Invoice Status': 'حالة الفاتورة',
          'Doc Sub-type Name': 'اسم النوع الفرعي للمستند',
          'Payment method': 'طريقة الدفع',
          'Doc date': 'تاريخ المستند',
          'Doc Sub-type': 'النوع الفرعي للمستند',
          Photo: 'الصورة',
          Country: 'الدولة',
          Phone: 'الهاتف',
          'Active status': 'حالة التفعيل',
          'Location Code': 'رمز الموقع',
          'Location Name': 'اسم الموقع',
          'Parent Location': 'الموقع الرئيسي',
          Type: 'النوع',
          Level: 'المستوى',
          Remarks: 'ملاحظات',
          // Filters
          'All invoices': 'كل الفواتير',
          'Cash invoices': 'فواتير نقدية',
          'Credit invoices': 'فواتير آجلة',
          'Recent invoices': 'فواتير حديثة',
          'All customers': 'كل العملاء',
          'Active customers': 'عملاء نشطون',
          'Inactive customers': 'عملاء غير نشطين',
          'Retail customers': 'عملاء تجزئة',
          'All locations': 'كل المواقع',
          'Active locations': 'مواقع نشطة',
          'Root locations': 'مواقع رئيسية',
          'Inactive locations': 'مواقع غير نشطة',
          // Filter operators
          contains: 'يحتوي على',
          'starts with': 'يبدأ بـ',
          'is equal to': 'يساوي',
          'is not equal to': 'لا يساوي',
          // KPI cards
          'Invoices in view': 'الفواتير المعروضة',
          Posted: 'مرحّلة',
          Pending: 'معلقة',
          'Gross value': 'القيمة الإجمالية',
          'Customers in view': 'العملاء المعروضون',
          Retail: 'تجزئة',
          'Locations in view': 'المواقع المعروضة',
          'Root locations ': 'مواقع رئيسية',
          'Hierarchy depth': 'عمق الهيكل',
          // Dashboard screen
          'Revenue this month': 'إيرادات الشهر الحالي',
          'Open invoices': 'فواتير مفتوحة',
          'Items in stock': 'أصناف بالمخزون',
          // Top-level modules (launchpad tiles / sidebar rail)
          Dashboard: 'لوحة التحكم',
          Vendors: 'الموردون',
          'Inventory Systems Management': 'إدارة نظم المخزون',
          'Sales Systems Management': 'إدارة نظم المبيعات',
          'Purchase Systems Management': 'إدارة نظم المشتريات',
          'POS System Management': 'إدارة نظام نقاط البيع',
          'Finance and Accounting': 'المالية والمحاسبة',
          'Fixed Assests System': 'نظام الأصول الثابتة',
          'Human Capital Management': 'إدارة رأس المال البشري',
          'Real Estate Management System': 'نظام إدارة العقارات',
          'Maintenance Workshop System': 'نظام ورشة الصيانة',
          'Car rent system': 'نظام تأجير السيارات',
          'Manufacturing Resource Planning': 'تخطيط موارد التصنيع',
          'Customer Relations Management': 'إدارة علاقات العملاء',
          'Hospital Management': 'إدارة المستشفى',
          'System Administration': 'إدارة النظام',
          'System Setup': 'إعداد النظام',
        }
        const t = (key, fallback = key) => (appLocale === 'ar' ? I18N[key] || fallback : fallback)

        const ARABIC_MONTHS = [
          'يناير',
          'فبراير',
          'مارس',
          'أبريل',
          'مايو',
          'يونيو',
          'يوليو',
          'أغسطس',
          'سبتمبر',
          'أكتوبر',
          'نوفمبر',
          'ديسمبر',
        ]
        function formatLocaleDate(isoOrSlashDate) {
          if (!isoOrSlashDate) return ''
          let day, month, year
          if (isoOrSlashDate.includes('-')) [year, month, day] = isoOrSlashDate.split('-')
          else [day, month, year] = isoOrSlashDate.split('/')
          if (appLocale !== 'ar') return isoOrSlashDate
          const monthName = ARABIC_MONTHS[Number(month) - 1] || month
          const arabicDigits = String(Number(day)).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
          const arabicYear = year.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d])
          return `${arabicDigits} ${monthName} ${arabicYear}`
        }
        function formatLocaleCurrency(amount, currencyCode = 'EGP') {
          const value = Number(amount) || 0
          if (appLocale === 'ar')
            return new Intl.NumberFormat('ar-EG', {
              style: 'currency',
              currency: currencyCode,
              currencyDisplay: 'code',
            }).format(value)
          return `${value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currencyCode}`
        }

  const subscribers = new Set()

  function getLocale() {
    return appLocale
  }

  function setLocale(locale) {
    if (locale === appLocale) return
    appLocale = locale
    subscribers.forEach(callback => callback(appLocale))
  }

  function subscribe(callback) {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }

  return {
    t,
    formatDate: formatLocaleDate,
    formatCurrency: formatLocaleCurrency,
    getLocale,
    setLocale,
    subscribe,
  }
}

export const encodeHtml = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    character =>
      ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character]
  )
