/* Creator-approval smoke test. Drives the REAL HTTP API for every state
 * transition; uses Prisma only to (a) simulate completed media/uploads that
 * would otherwise require S3, and (b) assert DB rows. */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api';

const log = (...a) => console.log(...a);
const line = () => log('-'.repeat(78));
const bugs = [];
function bug(title, detail) { bugs.push({ title, detail }); log(`   🐞 BUG: ${title}\n      ${detail}`); }
function check(cond, pass, fail) { log(`   ${cond ? '✅' : '❌'} ${cond ? pass : fail}`); return cond; }

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = text; }
  const setCookie = res.headers.get('set-cookie') || '';
  const m = /accessToken=([^;]+)/.exec(setCookie);
  return { status: res.status, json, accessToken: m ? m[1] : undefined };
}

async function registerCreator(email) {
  const r = await api('POST', '/auth/register/creator', {
    body: { email, password: 'CreatorPass123!', name: email.split('@')[0], phone: '+9198' + Math.floor(10000000 + Math.random() * 89999999) },
  });
  if (r.status < 200 || r.status >= 300) throw new Error(`register failed ${r.status}: ${JSON.stringify(r.json)}`);
  const profile = await prisma.creatorProfile.findFirst({ where: { user: { email } }, select: { id: true, userId: true } });
  return { token: r.accessToken, creatorProfileId: profile.id, userId: profile.userId };
}

async function loginAdmin() {
  const r = await api('POST', '/auth/login', { body: { email: 'admin@smoke.test', password: 'AdminPass123!', role: 'ADMIN' } });
  if (!r.accessToken) throw new Error(`admin login failed ${r.status}: ${JSON.stringify(r.json)}`);
  return r.accessToken;
}

async function seedCompleteness(creatorProfileId, { instagram }) {
  const pick = async (dimension, n) => prisma.creatorFacetOption.findMany({ where: { dimension }, take: n, orderBy: { sortOrder: 'asc' } });
  const niches = await pick('CONTENT_CATEGORY', 3);
  const [ctype] = await pick('CREATOR_TYPE', 1);
  const [occ] = await pick('OCCUPATION', 1);
  const [appr] = await pick('APPEARANCE', 1);
  const [lang] = await pick('LANGUAGE', 1);
  const mandatory = await prisma.creatorAddOnOption.findMany({ where: { mandatory: true }, select: { name: true } });

  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: {
      profileImageUrl: 'https://cdn.example.com/pfp.jpg', profileImageKey: 'pfp.jpg',
      introVideoUrl: 'https://cdn.example.com/intro.mp4', introVideoKey: 'intro.mp4',
      bio: 'Experienced UGC creator producing authentic short-form video content for brands.',
      countryName: 'India', stateName: 'Maharashtra', city: 'Mumbai',
      gender: 'FEMALE', dateOfBirth: new Date('1998-05-20'), shippingAddress: '12 MG Road, Mumbai 400001',
    },
  });
  // Facets: 1 primary + 2 secondary niches, plus single-selects
  await prisma.creatorProfileFacetSelection.deleteMany({ where: { creatorProfileId } });
  await prisma.creatorProfileFacetSelection.createMany({
    data: [
      { creatorProfileId, optionId: niches[0].id, rank: 0 },
      { creatorProfileId, optionId: niches[1].id, rank: 1 },
      { creatorProfileId, optionId: niches[2].id, rank: 2 },
      { creatorProfileId, optionId: ctype.id, rank: 0 },
      { creatorProfileId, optionId: occ.id, rank: 0 },
      { creatorProfileId, optionId: appr.id, rank: 0 },
    ],
  });
  await prisma.creatorProfileLanguage.deleteMany({ where: { creatorProfileId } });
  await prisma.creatorProfileLanguage.create({ data: { creatorProfileId, optionId: lang.id } });
  // Package (1:1)
  await prisma.creatorPackage.deleteMany({ where: { creatorId: creatorProfileId } });
  await prisma.creatorPackage.create({ data: { creatorId: creatorProfileId, name: 'Basic', deliverables: ['1 Video'], priceAmount: 5000, deliveryDays: 5 } });
  // Mandatory add-ons priced
  await prisma.creatorAddOn.deleteMany({ where: { creatorId: creatorProfileId } });
  await prisma.creatorAddOn.createMany({ data: mandatory.map((m) => ({ creatorId: creatorProfileId, name: m.name, priceAmount: 1000 })) });
  // 3 public, playable portfolio videos
  await prisma.creatorPortfolioVideo.deleteMany({ where: { creatorId: creatorProfileId } });
  await prisma.creatorPortfolioVideo.createMany({
    data: [1, 2, 3].map((i) => ({ creatorId: creatorProfileId, videoKey: `v${i}.mp4`, videoUrl: `https://cdn.example.com/v${i}.mp4`, visibilityStatus: 'PUBLIC', assetState: 'READY', source: 'UPLOAD' })),
  });
  if (instagram) {
    await prisma.socialConnection.upsert({
      where: { creatorProfileId_platform: { creatorProfileId, platform: 'INSTAGRAM' } },
      update: { status: 'ACTIVE' },
      create: { creatorProfileId, platform: 'INSTAGRAM', providerAccountId: 'ig_' + creatorProfileId.slice(0, 8), username: 'smoke_ig', accessToken: 'enc', status: 'ACTIVE', followersCount: 12000 },
    });
  }
}

async function state(creatorProfileId) {
  const p = await prisma.creatorProfile.findUnique({ where: { id: creatorProfileId }, select: { completeProfile: true, isListed: true, creatorApproval: { select: { status: true, wasShortlisted: true, approvedAt: true } } } });
  return { status: p.creatorApproval?.status, wasShortlisted: p.creatorApproval?.wasShortlisted, completeProfile: p.completeProfile, isListed: p.isListed };
}
const fmt = (s) => `approval=${s.status} complete=${s.completeProfile} listed=${s.isListed} wasShortlisted=${s.wasShortlisted}`;

async function inSegment(token, segment, creatorProfileId) {
  const r = await api('GET', `/admin/creators?segment=${segment}&limit=50`, { token });
  const items = r.json?.items ?? r.json?.data ?? [];
  return { found: items.some((it) => it.id === creatorProfileId), count: r.json?.total ?? items.length, status: r.status };
}

async function main() {
  const admin = await loginAdmin();
  const stamp = Date.now();

  // ===================================================================
  line(); log('SCENARIO 1 — Self-complete path WITH Instagram (intended happy path)'); line();
  const c1 = await registerCreator(`c1_${stamp}@smoke.test`);
  let s = await state(c1.creatorProfileId);
  log(`1. Registered creator -> ${fmt(s)}`);
  check(s.status === 'PENDING' && !s.completeProfile, 'Lands in Building profile (PENDING, incomplete)', `expected PENDING+incomplete, got ${fmt(s)}`);
  let seg = await inSegment(admin, 'incomplete', c1.creatorProfileId);
  check(seg.found, `Appears in "Building profile" (incomplete) segment [total=${seg.count}]`, 'NOT in incomplete segment');

  await seedCompleteness(c1.creatorProfileId, { instagram: true });
  log('2. Seeded full profile incl. ACTIVE Instagram connection; creator clicks Go Live...');
  let go = await api('PATCH', `/creators/${c1.creatorProfileId}`, { token: c1.token, body: { goLive: true, acceptedGoLivePolicies: true } });
  log(`   Go-Live API -> HTTP ${go.status}`);
  s = await state(c1.creatorProfileId);
  log(`   after Go Live -> ${fmt(s)}`);
  check(s.completeProfile, 'completeProfile latched TRUE', 'completeProfile did NOT latch');
  check(s.status === 'SELF_COMPLETED', 'CreatorApproval status = SELF_COMPLETED', `expected SELF_COMPLETED, got ${s.status}`);
  seg = await inSegment(admin, 'self_completed', c1.creatorProfileId);
  check(seg.found, `Appears in "Self complete" segment [total=${seg.count}]`, 'NOT in self_completed segment');

  log('3. Admin clicks "Send for review"...');
  let sfr = await api('PATCH', `/admin/creators/${c1.creatorProfileId}/send-for-review`, { token: admin });
  log(`   send-for-review API -> HTTP ${sfr.status}`);
  s = await state(c1.creatorProfileId);
  log(`   after send-for-review -> ${fmt(s)}`);
  check(s.status === 'PENDING' && s.completeProfile, 'CreatorApproval = PENDING + completeProfile (Awaiting review)', `got ${fmt(s)}`);
  seg = await inSegment(admin, 'pending', c1.creatorProfileId);
  check(seg.found, `Appears in "Awaiting review" (pending) segment [total=${seg.count}]`, 'NOT in Awaiting review segment');
  let selfSeg = await inSegment(admin, 'self_completed', c1.creatorProfileId);
  check(!selfSeg.found, 'No longer in Self complete segment', 'STILL in self_completed segment');

  log('4. Admin approves...');
  let ap = await api('PATCH', `/admin/creators/${c1.creatorProfileId}/approve`, { token: admin });
  log(`   approve API -> HTTP ${ap.status}`);
  s = await state(c1.creatorProfileId);
  log(`   after approve -> ${fmt(s)}`);
  check(s.status === 'APPROVED' && s.isListed, 'CreatorApproval = APPROVED + isListed=true (Listed)', `got ${fmt(s)}`);
  seg = await inSegment(admin, 'listed', c1.creatorProfileId);
  check(seg.found, `Appears in "Listed" segment [total=${seg.count}]`, 'NOT in Listed segment');

  // ===================================================================
  line(); log('SCENARIO 2 — Self-complete WITHOUT Instagram ("continue without Instagram")'); line();
  const c2 = await registerCreator(`c2_${stamp}@smoke.test`);
  await seedCompleteness(c2.creatorProfileId, { instagram: false });
  log('1. Seeded full profile but NO Instagram connection; creator clicks Go Live...');
  go = await api('PATCH', `/creators/${c2.creatorProfileId}`, { token: c2.token, body: { goLive: true, acceptedGoLivePolicies: true } });
  s = await state(c2.creatorProfileId);
  log(`   Go-Live API -> HTTP ${go.status}   |   result -> ${fmt(s)}`);
  if (go.status >= 200 && go.status < 300 && s.status !== 'SELF_COMPLETED' && !s.completeProfile) {
    bug('Go-Live without Instagram is a SILENT no-op',
      `PATCH /creators/:id {goLive:true} returned HTTP ${go.status} (success) but completeProfile stayed false and status stayed ${s.status}. ` +
      `The backend Go-Live checklist (creator-profile-completeness.util.ts) hard-requires an ACTIVE Instagram connection, yet the endpoint returns 200 with no error and the creator is silently stuck in Building profile — never reaching Self complete / review. No message tells the creator or admin why.`);
  } else if (s.status === 'SELF_COMPLETED') {
    check(true, 'Self-completed WITHOUT Instagram (Instagram is effectively optional)', '');
  }

  log('2. Admin edits the creator and clicks Go Live in ADMIN mode (client bypasses IG gate)...');
  go = await api('PATCH', `/admin/creators/${c2.creatorProfileId}`, { token: admin, body: { goLive: true, acceptedGoLivePolicies: true } });
  s = await state(c2.creatorProfileId);
  log(`   Admin Go-Live API -> HTTP ${go.status}   |   result -> ${fmt(s)}`);
  if (go.status >= 200 && go.status < 300 && !s.completeProfile) {
    bug('Admin-mode Go-Live is blocked by server Instagram requirement (client/server mismatch)',
      `The creator wizard forces instagramConnected=true in adminMode (creator-profile-wizard.tsx:218) and lets an admin publish a creator that has no Instagram. But the server (creator-listing-state.util.ts) has NO admin bypass and still requires an ACTIVE Instagram connection. Result: admin "Go Live" returns HTTP ${go.status} yet completeProfile stays false — the profile is never published. This directly contradicts "create creator, continue without connecting Instagram".`);
  }

  // ===================================================================
  line(); log('SCENARIO 3 — Shortlisted path'); line();
  const c3 = await registerCreator(`c3_${stamp}@smoke.test`);
  s = await state(c3.creatorProfileId);
  log(`1. Registered creator -> ${fmt(s)} (Building profile)`);
  log('2. Admin shortlists the building creator...');
  let sl = await api('PATCH', `/admin/creators/${c3.creatorProfileId}/shortlist`, { token: admin });
  log(`   shortlist API -> HTTP ${sl.status}`);
  s = await state(c3.creatorProfileId);
  log(`   after shortlist -> ${fmt(s)}`);
  check(s.status === 'SHORTLISTED' && s.wasShortlisted, 'CreatorApproval = SHORTLISTED + wasShortlisted=true', `got ${fmt(s)}`);
  seg = await inSegment(admin, 'shortlisted', c3.creatorProfileId);
  check(seg.found, `Appears in "Shortlisted" segment [total=${seg.count}]`, 'NOT in shortlisted segment');

  await seedCompleteness(c3.creatorProfileId, { instagram: true });
  log('3. Shortlisted creator completes profile (with Instagram) and clicks Go Live...');
  go = await api('PATCH', `/creators/${c3.creatorProfileId}`, { token: c3.token, body: { goLive: true, acceptedGoLivePolicies: true } });
  log(`   Go-Live API -> HTTP ${go.status}`);
  s = await state(c3.creatorProfileId);
  log(`   after Go Live -> ${fmt(s)}`);
  check(s.completeProfile, 'completeProfile latched TRUE', 'completeProfile did NOT latch');
  check(s.status === 'PENDING', 'Shortlisted completion goes STRAIGHT to PENDING (Awaiting review), skipping Self complete', `expected PENDING, got ${s.status}`);
  let sc = await inSegment(admin, 'self_completed', c3.creatorProfileId);
  check(!sc.found, 'Correctly NOT in Self complete segment', 'wrongly in self_completed');
  seg = await inSegment(admin, 'pending', c3.creatorProfileId);
  check(seg.found, `Appears in "Awaiting review" (pending) segment [total=${seg.count}]`, 'NOT in Awaiting review segment');

  log('4. Admin approves shortlisted-completed creator...');
  ap = await api('PATCH', `/admin/creators/${c3.creatorProfileId}/approve`, { token: admin });
  s = await state(c3.creatorProfileId);
  log(`   approve API -> HTTP ${ap.status}  |  result -> ${fmt(s)}`);
  check(s.status === 'APPROVED' && s.isListed, 'CreatorApproval = APPROVED + isListed=true', `got ${fmt(s)}`);

  // ===================================================================
  line(); log('SCENARIO 4 — Guard checks (negative paths)'); line();
  // approve a self-completed (not yet sent for review) should be blocked
  const c4 = await registerCreator(`c4_${stamp}@smoke.test`);
  await seedCompleteness(c4.creatorProfileId, { instagram: true });
  await api('PATCH', `/creators/${c4.creatorProfileId}`, { token: c4.token, body: { goLive: true, acceptedGoLivePolicies: true } });
  s = await state(c4.creatorProfileId);
  log(`1. Creator in ${s.status}. Admin tries to approve directly (should be blocked)...`);
  ap = await api('PATCH', `/admin/creators/${c4.creatorProfileId}/approve`, { token: admin });
  log(`   approve API -> HTTP ${ap.status}: ${JSON.stringify(ap.json?.message ?? ap.json)}`);
  check(ap.status === 400, 'Approving a Self-completed profile is rejected (must send for review first)', `expected 400, got ${ap.status}`);

  // shortlist a complete profile should be blocked
  log('2. Admin tries to shortlist an already-complete profile (should be blocked)...');
  sl = await api('PATCH', `/admin/creators/${c1.creatorProfileId}/shortlist`, { token: admin });
  log(`   shortlist API -> HTTP ${sl.status}: ${JSON.stringify(sl.json?.message ?? sl.json)}`);
  check(sl.status === 400, 'Shortlisting a complete profile is rejected', `expected 400, got ${sl.status}`);

  line();
  log(`\nSUMMARY: ${bugs.length} bug(s) surfaced.`);
  bugs.forEach((b, i) => log(`  ${i + 1}. ${b.title}`));
}

main().catch((e) => { console.error('FATAL', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
