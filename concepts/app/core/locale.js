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
          // Top-level modules (launchpad tiles / sidebar rail)
          Dashboard: 'لوحة التحكم',
          Vendors: 'الموردون',
          'Inventory Systems Management': 'إدارة نظم المخزون',
          'Sales Systems Management': 'إدارة نظم المبيعات',
          'Purchase Systems Management': 'إدارة نظم المشتريات',
          'POS System Management': 'إدارة نظام نقاط البيع',
          'Finance and Accounting': 'المالية والمحاسبة',
          'Fixed Assets System': 'نظام الأصول الثابتة',
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
