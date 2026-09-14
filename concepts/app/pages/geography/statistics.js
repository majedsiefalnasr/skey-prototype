

/** Owns geo statistics state and its DOM bindings. */
export function createGeoStatistics({dataListPercent} = {}) {
  function geoListStatistics(rows, config, total) {
    const active = rows.filter(row => row.active).length
    const inactive = rows.length - active
    const roots = rows.filter(row => !row.parentCode).length
    const levels = rows.reduce((maximum, row) => Math.max(maximum, Number(row.level)), 0)
    const activeRate = dataListPercent(active, total)
    return [
      {
        label: 'Locations in view',
        value: rows.length,
        support: `of ${config.rows.length} total locations`,
        supportAr: `من إجمالي ${config.rows.length} موقع`,
        icon: 'i-flow',
        tone: 'information',
        progress: dataListPercent(rows.length, config.rows.length),
        operation: 'Review the current location scope',
        benchmark: `${dataListPercent(rows.length, config.rows.length)}% of all locations`,
        trend: [40, 46, 52, 61, 68, 74],
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
        operation: 'Review location availability',
        benchmark: 'Target 95%',
        trend: [78, 82, 84, 87, 91, activeRate],
        trendLabel:
          activeRate >= 95
            ? `${activeRate - 95} pts above target`
            : `${95 - activeRate} pts to target`,
        trendTone: activeRate >= 95 ? 'success' : 'warning',
        attention: true,
        attentionLabel: 'Inactive locations',
        attentionValue: inactive,
        attentionSupport: inactive
          ? `${dataListPercent(inactive, total)}% of the current view is unavailable`
          : 'All locations in this view are active',
      },
      {
        label: 'Root locations',
        value: roots,
        support: 'Top-level hierarchy nodes',
        supportAr: 'عقد الهيكل الرئيسية',
        icon: 'i-grid',
        tone: 'neutral',
        progress: dataListPercent(roots, total),
        operation: 'Review top-level ownership',
        benchmark: 'Hierarchy structure',
        trend: [18, 20, 20, 22, 24, dataListPercent(roots, total)],
        trendLabel: 'Six-period structural mix',
        trendTone: 'neutral',
      },
      {
        label: 'Hierarchy depth',
        value: `${levels} levels`,
        support: 'Deepest level in this view',
        supportAr: 'أعمق مستوى في هذا العرض',
        icon: 'i-panel',
        tone: 'neutral',
        progress: dataListPercent(levels, 4),
        operation: 'Review hierarchy complexity',
        benchmark: 'Policy limit 4 levels',
        trend: [2, 2, 3, 3, 4, levels],
        trendLabel: levels <= 4 ? 'Within policy' : `${levels - 4} levels above policy`,
        trendTone: levels <= 4 ? 'success' : 'warning',
      },
    ]
  }

  return {geoListStatistics}
}
