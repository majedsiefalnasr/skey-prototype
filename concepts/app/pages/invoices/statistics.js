

/** Owns invoice statistics state and its DOM bindings. */
export function createInvoiceStatistics({dataListPercent} = {}) {
  function invoiceListStatistics(rows, config, total) {
    const posted = rows.filter(row => row.status === 'Posted').length
    const pending = rows.filter(row => row.status === 'Pending').length
    const postedRate = dataListPercent(posted, total)
    const pendingRate = dataListPercent(pending, total)
    const gross = rows.reduce(
      (sum, row) => sum + Number(String(row.total).replace(/,/g, '') || 0),
      0
    )
    const average = gross / total
    return [
      {
        label: 'Invoices in view',
        value: rows.length,
        support: `of ${config.rows.length} total invoices`,
        supportAr: `من إجمالي ${config.rows.length} فاتورة`,
        icon: 'i-doc',
        tone: 'information',
        progress: dataListPercent(rows.length, config.rows.length),
        operation: 'Review the current invoice queue',
        benchmark: `${dataListPercent(rows.length, config.rows.length)}% of all invoices`,
        trend: [48, 55, 51, 64, 69, 76],
        trendLabel: 'Current filtered scope',
        trendTone: 'neutral',
      },
      {
        label: 'Posted',
        value: posted,
        support: `${postedRate}% of this view`,
        supportAr: `${postedRate}% من هذا العرض`,
        icon: 'i-check',
        tone: 'success',
        progress: postedRate,
        operation: 'Review posted documents',
        benchmark: 'Target 75%',
        trend: [52, 58, 61, 66, 72, postedRate],
        trendLabel:
          postedRate >= 75
            ? `${postedRate - 75} pts above target`
            : `${75 - postedRate} pts to target`,
        trendTone: postedRate >= 75 ? 'success' : 'warning',
      },
      {
        label: 'Pending',
        value: pending,
        support: `${pendingRate}% need attention`,
        supportAr: `${pendingRate}% تحتاج إلى مراجعة`,
        icon: 'i-clock',
        tone: 'warning',
        progress: pendingRate,
        operation: 'Review pending invoices',
        benchmark: 'Threshold 15%',
        trend: [30, 27, 24, 21, 18, pendingRate],
        trendLabel:
          pendingRate <= 15 ? 'Within threshold' : `${pendingRate - 15} pts above threshold`,
        trendTone: pendingRate <= 15 ? 'success' : 'warning',
        attention: true,
        attentionLabel: 'Pending invoices',
        attentionValue: pending,
        attentionSupport: `${pendingRate}% of the current view needs review`,
      },
      {
        label: 'Gross value',
        value: `EGP ${gross.toLocaleString(undefined, {minimumFractionDigits: 2})}`,
        support: 'Across the current view',
        supportAr: 'عبر العرض الحالي',
        icon: 'i-grid',
        tone: 'neutral',
        progress: 100,
        operation: 'Review invoice value distribution',
        benchmark: `Average EGP ${average.toLocaleString(undefined, {maximumFractionDigits: 0})}`,
        trend: [42, 49, 47, 58, 71, 78],
        trendLabel: 'Six-period value pattern',
        trendTone: 'neutral',
      },
    ]
  }

  return {invoiceListStatistics}
}
