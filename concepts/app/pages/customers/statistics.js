

/** Owns customer statistics state and its DOM bindings. */
export function createCustomerStatistics({dataListPercent} = {}) {
  function customerListStatistics(rows, config, total) {
    const active = rows.filter(row => row.active).length
    const inactive = rows.length - active
    const retail = rows.filter(row => row.customerType === 'Retail').length
    const activeRate = dataListPercent(active, total)
    const inactiveRate = dataListPercent(inactive, total)
    const retailRate = dataListPercent(retail, total)
    return [
      {
        label: 'Customers in view',
        value: rows.length,
        support: `of ${config.rows.length} total customers`,
        supportAr: `من إجمالي ${config.rows.length} عميل`,
        icon: 'i-user',
        tone: 'information',
        progress: dataListPercent(rows.length, config.rows.length),
        operation: 'Review the current customer portfolio',
        benchmark: `${dataListPercent(rows.length, config.rows.length)}% of all customers`,
        trend: [43, 49, 57, 61, 69, 75],
        trendLabel: 'Current filtered scope',
        trendTone: 'neutral',
      },
      {
        label: 'Active',
        value: active,
        support: `${activeRate}% of this view`,
        supportAr: `${activeRate}% من هذا العرض`,
        icon: 'i-check',
        tone: 'success',
        progress: activeRate,
        operation: 'Review active accounts',
        benchmark: 'Target 90%',
        trend: [76, 79, 82, 84, 87, activeRate],
        trendLabel:
          activeRate >= 90
            ? `${activeRate - 90} pts above target`
            : `${90 - activeRate} pts to target`,
        trendTone: activeRate >= 90 ? 'success' : 'warning',
      },
      {
        label: 'Inactive',
        value: inactive,
        support: inactive ? 'Review account availability' : 'No inactive accounts',
        supportAr: inactive ? 'راجع توفر الحساب' : 'لا يوجد حسابات غير نشطة',
        icon: 'i-archive',
        tone: inactive ? 'warning' : 'neutral',
        progress: inactiveRate,
        operation: 'Review inactive customer accounts',
        benchmark: 'Threshold 10%',
        trend: [22, 20, 18, 16, 13, inactiveRate],
        trendLabel:
          inactiveRate <= 10
            ? 'Within threshold'
            : `${inactiveRate - 10} pts above threshold`,
        trendTone: inactiveRate <= 10 ? 'success' : 'warning',
        attention: true,
        attentionLabel: 'Inactive customers',
        attentionValue: inactive,
        attentionSupport: inactive
          ? `${inactiveRate}% of the current view may need follow-up`
          : 'No customer accounts need follow-up',
      },
      {
        label: 'Retail',
        value: retail,
        support: `${retailRate}% of this view`,
        supportAr: `${retailRate}% من هذا العرض`,
        icon: 'i-panel',
        tone: 'neutral',
        progress: retailRate,
        operation: 'Review customer type mix',
        benchmark: 'Portfolio mix',
        trend: [46, 49, 51, 50, 53, retailRate],
        trendLabel: 'Six-period portfolio mix',
        trendTone: 'neutral',
      },
    ]
  }

  return {customerListStatistics}
}
