// Collaboration-suite seed data (Notes, Activities, Events, Internal Mail,
// People Data) plus the demo clock every one of those screens reads.
// Loaded into core/collab-store.js only when the tab has no saved
// collaboration state; ids are stable so tests and links can name them.
// Mail keeps the original EMAIL_DATA ids (e1-e5) because notifications
// and openEmailView(messageId) already address messages by them.
import {EMAIL_DATA} from './messages.js'
import {ORGANIZATION_USERS} from './organization.js'
import {CURRENT_USER} from './profile.js'

/** The prototype's "now": every today/overdue/default time derives from it. */
export const PROTOTYPE_NOW = '2026-10-13T13:24'

export const CURRENT_USER_ID = 'usr-1'

export const COLLAB_USERS = ORGANIZATION_USERS.map(({id, name, role}) => ({
  id,
  name,
  role,
  email: id === CURRENT_USER_ID ? CURRENT_USER.email : `${name.split(' ')[0].toLowerCase()}@lastchance.local`,
}))

const SEEDED_AT = '2026-10-01T09:00'
const stamp = (entity, at = SEEDED_AT) => ({...entity, createdAt: at, updatedAt: at})
const me = {id: CURRENT_USER_ID, name: CURRENT_USER.name, email: CURRENT_USER.email}

const notes = [
  {id: 'note-1', title: 'Payment terms for Al Noor', body: 'Al Noor Trading pays 30 days net. They asked for 2% early-payment discount — check with Finance before quoting.', status: 'active', tags: ['customers'], pinned: true},
  {id: 'note-2', title: 'Month-end checklist', body: '- [ ] Reconcile bank accounts\n- [ ] Review unposted invoices\n- [ ] Close the period', status: 'draft', tags: ['finance'], pinned: false},
  {id: 'note-3', title: 'Warehouse 201 variance notes', body: 'Three lines on the Bill Outgoing Order differ from the count. Recount before shipping.', status: 'active', tags: ['warehouse'], pinned: false},
  {id: 'note-4', title: 'ملاحظات اجتماع المبيعات', body: 'مراجعة أهداف الربع الرابع ومتابعة العملاء الجدد.', status: 'active', tags: ['sales'], pinned: false},
  {id: 'note-5', title: 'Old pricing assumptions', body: 'Superseded by the October price list.', status: 'archived', tags: ['sales'], pinned: false},
].map(note => stamp({...note, type: 'note'}))

const activity = fields => stamp({type: 'activity', notes: '', priority: 'normal', archived: false, ...fields})
const activities = [
  activity({id: 'act-1', kind: 'call', summary: 'Call Al Noor about quotation 884', assigneeId: 'usr-1', status: 'planned', dueDate: '2026-10-13', scheduledStart: '2026-10-13T15:00', durationMin: 30, priority: 'high'}),
  activity({id: 'act-2', kind: 'todo', summary: 'Confirm stock counts for Bill Outgoing Order', assigneeId: 'usr-3', status: 'planned', dueDate: '2026-10-10'}),
  activity({id: 'act-3', kind: 'meeting', summary: 'Monthly sales review', assigneeId: 'usr-2', status: 'in_progress', scheduledStart: '2026-10-15T10:00', durationMin: 60}),
  activity({id: 'act-4', kind: 'email', summary: 'Send revised price list', assigneeId: 'usr-1', status: 'planned', dueDate: '2026-10-16'}),
  activity({id: 'act-5', kind: 'todo', summary: 'Archive Q3 receipts', assigneeId: 'usr-4', status: 'done', dueDate: '2026-10-05'}),
  activity({id: 'act-6', kind: 'todo', summary: 'Review password policy', assigneeId: 'usr-1', status: 'planned', dueDate: '2026-10-20', priority: 'low'}),
]

const event = fields => stamp({type: 'event', location: '', participantIds: [CURRENT_USER_ID], reminder: 'none', repeat: 'none', description: '', ...fields})
const events = [
  event({id: 'evt-1', title: 'Monthly sales review', allDay: false, start: '2026-10-15T10:00', end: '2026-10-15T11:00', location: 'Meeting room 2', participantIds: ['usr-1', 'usr-2', 'usr-3'], reminder: '10m', repeat: 'monthly'}),
  event({id: 'evt-2', title: 'Company holiday', allDay: true, start: '2026-10-06', end: '2026-10-06'}),
  event({id: 'evt-3', title: 'Customer visit — Al Noor', allDay: false, start: '2026-10-13T11:00', end: '2026-10-13T12:00', location: 'Cairo HQ'}),
  event({id: 'evt-4', title: 'Quarter close', allDay: true, start: '2026-10-29', end: '2026-10-30'}),
]

const fromFixture = message =>
  stamp(
    {
      id: message.id,
      type: 'mail',
      folder: 'inbox',
      threadId: `t-${message.id}`,
      from: {name: message.from, email: message.email},
      to: message.to,
      cc: message.cc,
      subject: message.subject,
      body: message.body,
      attachments: message.attachments,
      unread: message.unread,
      starred: message.id === 'e1',
      hue: message.hue,
      sentAt: `${message.day === 'Today' ? '2026-10-13' : '2026-10-12'}T${message.time}`,
    },
    `${message.day === 'Today' ? '2026-10-13' : '2026-10-12'}T${message.time}`
  )
const mail = [
  ...EMAIL_DATA.map(fromFixture),
  stamp(
    {
      id: 'mail-s1',
      type: 'mail',
      folder: 'sent',
      threadId: 't-e2',
      from: me,
      to: [{name: 'Warehouse Ops', email: 'warehouse@lastchance.local'}],
      cc: [],
      subject: 'Re: Stock check needed before Bill Outgoing Order ships',
      body: ['Thanks — Omar will recount the three lines this afternoon.', 'Majed'],
      attachments: [],
      unread: false,
      starred: false,
      hue: 210,
      sentAt: '2026-10-13T12:40',
    },
    '2026-10-13T12:40'
  ),
  stamp(
    {
      id: 'mail-d1',
      type: 'mail',
      folder: 'drafts',
      threadId: 't-d1',
      from: me,
      to: [{id: 'usr-2', name: 'Mariam Adel', email: 'mariam@lastchance.local'}],
      cc: [],
      subject: 'Price list update',
      body: ['Hi Mariam,', 'The revised October price list is attached for your review.'],
      attachments: [],
      unread: false,
      starred: false,
      hue: 210,
      savedAt: '2026-10-13T12:10',
    },
    '2026-10-13T12:10'
  ),
]

const person = fields => stamp({type: 'person', nameAr: '', company: '', jobTitle: '', contacts: [], city: '', country: 'Egypt', lifecycle: 'lead', archived: false, notes: '', ...fields})
const people = [
  person({id: 'per-1', nameEn: 'Ahmed Ali', nameAr: 'أحمد علي', company: 'Al Noor Trading', jobTitle: 'Purchasing Manager', city: 'Cairo', contacts: [{kind: 'mobile', value: '+20 100 555 0101', primary: true}, {kind: 'email', value: 'ahmed.ali@alnoor.example', primary: false}]}),
  person({id: 'per-2', nameEn: 'Sara Mahmoud', nameAr: 'سارة محمود', company: 'Delta Supplies', jobTitle: 'Accountant', city: 'Giza', contacts: [{kind: 'mobile', value: '+20 122 555 0199', primary: true}, {kind: 'email', value: 'sara.m@example.com', primary: false}]}),
  person({id: 'per-3', nameEn: 'Khaled Ibrahim', nameAr: 'خالد إبراهيم', company: 'Nile Foods', lifecycle: 'contact', city: 'Alexandria', contacts: [{kind: 'phone', value: '+20 3 555 0142', primary: true}], convertedTo: {target: 'customer', at: '2026-10-01T10:00'}}),
  person({id: 'per-4', nameEn: 'Ahmed Aly', company: 'Al Noor Trading', contacts: [{kind: 'mobile', value: '0020 100 555 0101', primary: true}]}),
]

const link = (id, a, b) => ({id, a, b, createdAt: SEEDED_AT})
const ref = (type, id) => ({type, id})

export const COLLAB_SEED = {
  entities: {note: notes, activity: activities, event: events, mail, person: people},
  links: [
    link('lnk-1', ref('note', 'note-1'), ref('person', 'per-1')),
    link('lnk-2', ref('note', 'note-1'), ref('activity', 'act-1')),
    link('lnk-3', ref('activity', 'act-1'), ref('person', 'per-1')),
    link('lnk-4', ref('activity', 'act-1'), ref('mail', 'e4')),
    link('lnk-5', ref('activity', 'act-3'), ref('event', 'evt-1')),
    link('lnk-6', ref('note', 'note-3'), ref('mail', 'e2')),
    link('lnk-7', ref('activity', 'act-2'), ref('mail', 'e2')),
    link('lnk-8', ref('note', 'note-4'), ref('event', 'evt-1')),
  ],
}
