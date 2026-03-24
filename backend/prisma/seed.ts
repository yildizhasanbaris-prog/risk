import { PrismaClient, ReportStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Roles
  const roles = await Promise.all([
    prisma.role.upsert({ where: { name: 'Reporter' }, update: {}, create: { name: 'Reporter' } }),
    prisma.role.upsert({ where: { name: 'SafetyOfficer' }, update: {}, create: { name: 'SafetyOfficer' } }),
    prisma.role.upsert({ where: { name: 'Manager' }, update: {}, create: { name: 'Manager' } }),
    prisma.role.upsert({ where: { name: 'Admin' }, update: {}, create: { name: 'Admin' } }),
  ]);
  console.log('Roles created');

  // Departments
  const deptData = [
    { code: 'LINE', name: 'Line' },
    { code: 'WORKSHOP', name: 'Workshop' },
    { code: 'STORES', name: 'Stores' },
    { code: 'OFFICE', name: 'Office' },
    { code: 'QA', name: 'Quality Assurance' },
    { code: 'SMS', name: 'Safety Management' },
  ];
  for (const d of deptData) {
    await prisma.department.upsert({ where: { code: d.code }, update: {}, create: d });
  }
  console.log('Departments created');

  // Severity Levels (Table 50 - EASA/ICAO)
  const severityData = [
    { code: 'A', description: 'Catastrophic', sortOrder: 1 },
    { code: 'B', description: 'Hazardous', sortOrder: 2 },
    { code: 'C', description: 'Major', sortOrder: 3 },
    { code: 'D', description: 'Minor', sortOrder: 4 },
    { code: 'E', description: 'Negligible', sortOrder: 5 },
  ];
  for (const s of severityData) {
    await prisma.severityLevel.upsert({ where: { code: s.code }, update: {}, create: s });
  }
  console.log('Severity levels created');

  // Likelihood Levels (Table 50 - Probability)
  const likelihoodData = [
    { code: 5, description: 'Frequent', sortOrder: 1 },
    { code: 4, description: 'Occasional', sortOrder: 2 },
    { code: 3, description: 'Remote', sortOrder: 3 },
    { code: 2, description: 'Improbable', sortOrder: 4 },
    { code: 1, description: 'Extremely Improbable', sortOrder: 5 },
  ];
  for (const l of likelihoodData) {
    await prisma.likelihoodLevel.upsert({ where: { code: l.code }, update: {}, create: l });
  }
  console.log('Likelihood levels created');

  // Risk Matrix (Table 50 - 5x5 grid)
  const riskMatrixData: { severityCode: string; likelihoodCode: number; riskIndex: string; riskLevel: string }[] = [
    { severityCode: 'A', likelihoodCode: 5, riskIndex: '5A', riskLevel: 'INTOLERABLE' },
    { severityCode: 'B', likelihoodCode: 5, riskIndex: '5B', riskLevel: 'INTOLERABLE' },
    { severityCode: 'C', likelihoodCode: 5, riskIndex: '5C', riskLevel: 'INTOLERABLE' },
    { severityCode: 'D', likelihoodCode: 5, riskIndex: '5D', riskLevel: 'TOLERABLE' },
    { severityCode: 'E', likelihoodCode: 5, riskIndex: '5E', riskLevel: 'TOLERABLE' },
    { severityCode: 'A', likelihoodCode: 4, riskIndex: '4A', riskLevel: 'INTOLERABLE' },
    { severityCode: 'B', likelihoodCode: 4, riskIndex: '4B', riskLevel: 'INTOLERABLE' },
    { severityCode: 'C', likelihoodCode: 4, riskIndex: '4C', riskLevel: 'TOLERABLE' },
    { severityCode: 'D', likelihoodCode: 4, riskIndex: '4D', riskLevel: 'TOLERABLE' },
    { severityCode: 'E', likelihoodCode: 4, riskIndex: '4E', riskLevel: 'TOLERABLE' },
    { severityCode: 'A', likelihoodCode: 3, riskIndex: '3A', riskLevel: 'INTOLERABLE' },
    { severityCode: 'B', likelihoodCode: 3, riskIndex: '3B', riskLevel: 'TOLERABLE' },
    { severityCode: 'C', likelihoodCode: 3, riskIndex: '3C', riskLevel: 'TOLERABLE' },
    { severityCode: 'D', likelihoodCode: 3, riskIndex: '3D', riskLevel: 'TOLERABLE' },
    { severityCode: 'E', likelihoodCode: 3, riskIndex: '3E', riskLevel: 'ACCEPTABLE' },
    { severityCode: 'A', likelihoodCode: 2, riskIndex: '2A', riskLevel: 'TOLERABLE' },
    { severityCode: 'B', likelihoodCode: 2, riskIndex: '2B', riskLevel: 'TOLERABLE' },
    { severityCode: 'C', likelihoodCode: 2, riskIndex: '2C', riskLevel: 'TOLERABLE' },
    { severityCode: 'D', likelihoodCode: 2, riskIndex: '2D', riskLevel: 'ACCEPTABLE' },
    { severityCode: 'E', likelihoodCode: 2, riskIndex: '2E', riskLevel: 'ACCEPTABLE' },
    { severityCode: 'A', likelihoodCode: 1, riskIndex: '1A', riskLevel: 'TOLERABLE' },
    { severityCode: 'B', likelihoodCode: 1, riskIndex: '1B', riskLevel: 'ACCEPTABLE' },
    { severityCode: 'C', likelihoodCode: 1, riskIndex: '1C', riskLevel: 'ACCEPTABLE' },
    { severityCode: 'D', likelihoodCode: 1, riskIndex: '1D', riskLevel: 'ACCEPTABLE' },
    { severityCode: 'E', likelihoodCode: 1, riskIndex: '1E', riskLevel: 'ACCEPTABLE' },
  ];
  for (const rm of riskMatrixData) {
    await prisma.riskMatrix.upsert({
      where: { severityCode_likelihoodCode: { severityCode: rm.severityCode, likelihoodCode: rm.likelihoodCode } },
      update: { riskIndex: rm.riskIndex, riskLevel: rm.riskLevel },
      create: rm,
    });
  }
  console.log('Risk matrix created');

  // Categories
  const categoryData = [
    { code: 'MAINT_ERROR', description: 'Maintenance Error' },
    { code: 'HF', description: 'Human Factors' },
    { code: 'PROC_DEV', description: 'Procedure Deviation' },
    { code: 'HAZARD', description: 'Hazard' },
    { code: 'NEAR_MISS', description: 'Near-Miss' },
    { code: 'OTHER', description: 'Other' },
  ];
  for (const c of categoryData) {
    await prisma.category.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log('Categories created');

  const caseTypeData = [
    { code: 'OCCURRENCE', description: 'Occurrence / Event' },
    { code: 'HAZARD', description: 'Hazard' },
    { code: 'NEAR_MISS', description: 'Near miss' },
    { code: 'HF_ISSUE', description: 'Human factors issue' },
    { code: 'PROC_DEV', description: 'Procedural deviation' },
    { code: 'SUBCONTRACTOR', description: 'Subcontractor safety' },
    { code: 'AUDIT', description: 'Audit-related safety concern' },
    { code: 'CHANGE', description: 'Management of change' },
    { code: 'VOLUNTARY', description: 'Voluntary report' },
  ];
  for (const ct of caseTypeData) {
    await prisma.caseType.upsert({ where: { code: ct.code }, update: {}, create: ct });
  }
  console.log('Case types created');

  const extraRoles = [
    'DepartmentReviewer',
    'SMSManager',
    'Investigator',
    'ActionOwner',
    'DepartmentManager',
    'QualityManager',
    'AccountableManager',
    'SRBViewer',
    'SRBApprover',
  ];
  for (const rn of extraRoles) {
    await prisma.role.upsert({ where: { name: rn }, update: {}, create: { name: rn } });
  }
  console.log('Extended roles created');

  // Admin user (password: admin123)
  const adminRole = roles.find((r) => r.name === 'Admin')!;
  const adminDept = await prisma.department.findUnique({ where: { code: 'SMS' } });
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@sms.local' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@sms.local',
      passwordHash,
      departmentId: adminDept?.id,
      roleId: adminRole.id,
    },
  });
  console.log('Admin user created (admin@sms.local / admin123)');

  // Demo Safety Officer
  const safetyRole = roles.find((r) => r.name === 'SafetyOfficer')!;
  await prisma.user.upsert({
    where: { email: 'safety@sms.local' },
    update: {},
    create: {
      name: 'Safety Officer',
      email: 'safety@sms.local',
      passwordHash,
      departmentId: adminDept?.id,
      roleId: safetyRole.id,
    },
  });
  console.log('Safety Officer created (safety@sms.local / admin123)');

  // Demo Reporter
  const reporterRole = roles.find((r) => r.name === 'Reporter')!;
  const lineDept = await prisma.department.findUnique({ where: { code: 'LINE' } });
  const reporterUser = await prisma.user.upsert({
    where: { email: 'reporter@sms.local' },
    update: {},
    create: {
      name: 'Test Reporter',
      email: 'reporter@sms.local',
      passwordHash,
      departmentId: lineDept?.id,
      roleId: reporterRole.id,
    },
  });
  console.log('Reporter created (reporter@sms.local / admin123)');

  // 10 test reports
  const year = new Date().getFullYear();
  const testReports = [
    { title: 'Yanlış PN seçimi', description: 'Hangar 1\'de yapılan bakımda yanlış parça numarası kullanıldı.', status: ReportStatus.NEW, category: 'MAINT_ERROR', dept: 'LINE', risk: null },
    { title: 'Prosedür sapması - checklist atlandı', description: 'Kalkış öncesi kontrol listesinde 2 madde atlandı.', status: ReportStatus.UNDER_REVIEW, category: 'PROC_DEV', dept: 'LINE', risk: null },
    { title: 'Yakıt sızıntısı tespiti', description: 'Uçak altında küçük yakıt sızıntısı gözlemlendi.', status: ReportStatus.HIRM_REQUIRED, category: 'HAZARD', dept: 'LINE', risk: 'INTOLERABLE' },
    { title: 'Near-miss: ramp araç çarpışması', description: 'Ramp taşımacılığında iki araç arasında kıl payı kaçınılması.', status: ReportStatus.IN_HIRM, category: 'NEAR_MISS', dept: 'LINE', risk: 'TOLERABLE' },
    { title: 'İnsan faktörü - yorgunluk', description: 'Gece vardiyasında teknisyen hatası, yorgunluk belirtisi.', status: ReportStatus.ACTION_PLANNING, category: 'HF', dept: 'WORKSHOP', risk: 'TOLERABLE' },
    { title: 'Eksik dokümantasyon', description: 'AMM revizyonu güncel değil, eski prosedür kullanıldı.', status: ReportStatus.ACTION_IN_PROGRESS, category: 'PROC_DEV', dept: 'OFFICE', risk: 'ACCEPTABLE' },
    { title: 'Alet kalibrasyon süresi dolmuş', description: 'Torque wrench kalibrasyon tarihi geçmiş.', status: ReportStatus.PENDING_EFFECTIVENESS_CHECK, category: 'MAINT_ERROR', dept: 'WORKSHOP', risk: 'ACCEPTABLE' },
    { title: 'Kabin basınç uyarısı', description: 'Uçuş sırasında kabin basınç uyarısı alındı, acil iniş yapıldı.', status: ReportStatus.CLOSED, category: 'HAZARD', dept: 'LINE', risk: 'INTOLERABLE' },
    { title: 'Yanlış yağ kullanımı', description: 'Motor yağında yanlış tip kullanımı tespit edildi.', status: ReportStatus.NOT_SAFETY_RELATED, category: 'MAINT_ERROR', dept: 'LINE', risk: null },
    { title: 'APU arıza raporu', description: 'APU başlatma sırasında 3 denemede başarısız.', status: ReportStatus.UNDER_REVIEW, category: 'HAZARD', dept: 'LINE', risk: null },
  ];

  const lineDeptId = lineDept?.id;
  const workshopDept = await prisma.department.findUnique({ where: { code: 'WORKSHOP' } });
  const officeDept = await prisma.department.findUnique({ where: { code: 'OFFICE' } });

  for (let i = 0; i < testReports.length; i++) {
    const r = testReports[i];
    const deptId = r.dept === 'LINE' ? lineDeptId : r.dept === 'WORKSHOP' ? workshopDept?.id : officeDept?.id;
    const category = await prisma.category.findUnique({ where: { code: r.category } });
    const reportNo = `SMS-${year}-${String(900 + i + 1).padStart(3, '0')}`; // 901-910 demo range
    await prisma.report.upsert({
      where: { reportNo },
      update: {
        title: r.title,
        description: r.description,
        status: r.status,
        currentRiskLevel: r.risk,
        departmentId: deptId ?? undefined,
        categoryId: category?.id,
      },
      create: {
        reportNo,
        title: r.title,
        description: r.description,
        reportedByUserId: reporterUser.id,
        departmentId: deptId ?? undefined,
        location: r.dept === 'LINE' ? 'Hangar 1' : r.dept === 'WORKSHOP' ? 'Atölye A' : 'Ofis',
        aircraftReg: i < 2 ? 'TC-ABC' : i < 5 ? 'TC-XYZ' : undefined,
        aircraftType: i < 3 ? 'B737-800' : undefined,
        componentPn: i === 0 ? '65C12345' : i === 6 ? 'TW-450' : undefined,
        immediateActions: i < 4 ? 'İlgili alan işaretlendi, operasyon durduruldu.' : undefined,
        categoryId: category?.id,
        isSafetyRelated: r.status !== ReportStatus.NOT_SAFETY_RELATED,
        isMor: i === 2 || i === 7,
        status: r.status,
        currentRiskLevel: r.risk,
        closedAt: r.status === ReportStatus.CLOSED ? new Date() : undefined,
        closureSummary: r.status === ReportStatus.CLOSED ? 'Tamamlandı, lesson learned paylaşıldı.' : undefined,
      },
    });
  }
  console.log('10 test reports created');

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
