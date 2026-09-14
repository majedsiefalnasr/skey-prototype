// Messages fixtures -- moved verbatim (by name, unmodified bodies) out of
// concepts/app/legacy-app.js as part of Task 5's fixture-ownership split.
// NOTIF_DATA is the system-notifications panel's sample data ("Direct" tab);
// EMAIL_DATA is the app's own inbox -- separate from system notifications,
// so it gets its own tab instead of being mixed into "Direct" (original
// inline comment preserved below).
//
// Read-only sample/reference data: legacy-app.js never mutates either in
// place.

export const NOTIF_DATA = {
  direct: [
    {
      icon: 'i-post',
      unread: true,
      who: 'Majed Sief Alnasr',
      what: 'posted Sales Invoice 126',
      time: '2h',
    },
    {
      icon: 'i-warn',
      unread: true,
      who: 'System',
      what: 'flagged an unbalanced journal entry on Invoice 118',
      time: 'Yesterday',
    },
    {
      icon: 'i-chat',
      unread: false,
      who: 'General accountant',
      what: 'commented on Invoice 126',
      time: '2d',
    },
  ],
}

/* the app's own inbox -- separate from system notifications above, so it gets
   its own tab instead of being mixed into "Direct" */
export const EMAIL_DATA = [
  {
    id: 'e1',
    day: 'Today',
    from: 'Finance Team',
    email: 'finance@lastchance.local',
    subject: 'Payment scheduled for Sales Invoice 126',
    time: '16:05',
    unread: true,
    hue: 258,
    to: [{name: 'Kathleen', email: 'kathleen@lastchance.local'}],
    cc: [{name: 'Kane', email: 'kane@lastchance.local'}],
    body: [
      'Good morning,',
      'Your payment for Sales Invoice 126 is scheduled for processing on 29/07/2026, for 20,000.00 EGP on credit terms.',
      'No action is needed on your side — the receipt voucher will be generated automatically once the payment clears. If the amount or due date looks wrong, reply to this email and Finance will take a look.',
      'Thanks,\nFinance Team',
    ],
    attachments: [{name: 'invoice-126.pdf', size: '214 KB'}],
  },
  {
    id: 'e2',
    day: 'Today',
    from: 'Warehouse Ops',
    email: 'warehouse@lastchance.local',
    subject: 'Stock check needed before Bill Outgoing Order ships',
    time: '14:20',
    unread: true,
    hue: 189,
    to: [{name: 'Kathleen', email: 'kathleen@lastchance.local'}],
    cc: [],
    body: [
      'Hi,',
      'Warehouse 201 shows a stock variance on 3 line items linked to your recent Bill Outgoing Order. Please confirm the counts before the shipment goes out today.',
      'Thanks.',
    ],
    attachments: [],
  },
  {
    id: 'e3',
    day: 'Today',
    from: 'System Admin',
    email: 'admin@lastchance.local',
    subject: 'Your password expires in 5 days',
    time: '11:05',
    unread: false,
    hue: 18,
    to: [{name: 'Kathleen', email: 'kathleen@lastchance.local'}],
    cc: [],
    body: [
      'Hello,',
      'Your password expires in 5 days. Update it from your account settings to avoid being locked out.',
      'System Admin',
    ],
    attachments: [],
  },
  {
    id: 'e4',
    day: 'Yesterday',
    from: 'Vendor Portal',
    email: 'vendors@lastchance.local',
    subject: 'New quotation received from Al Noor Trading',
    time: '17:40',
    unread: false,
    hue: 142,
    to: [{name: 'Kathleen', email: 'kathleen@lastchance.local'}],
    cc: [],
    body: [
      'A new quotation for Purchase Order request #884 is ready for your review in the Vendor Portal.',
      'Please review and approve within 3 business days.',
    ],
    attachments: [{name: 'quotation-884.pdf', size: '98 KB'}],
  },
  {
    id: 'e5',
    day: 'Yesterday',
    from: 'Finance Team',
    email: 'finance@lastchance.local',
    subject: 'Undo request approved on Invoice 118',
    time: '09:15',
    unread: false,
    hue: 258,
    to: [{name: 'Kathleen', email: 'kathleen@lastchance.local'}],
    cc: [],
    body: [
      'The undo posting request you submitted for Invoice 118 has been approved by the accounting supervisor.',
      'The invoice is unlocked for editing.',
    ],
    attachments: [],
  },
]
