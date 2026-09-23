// =============================================================================
// Database Seeder — Multi-Tenant EBRR Investigations
// =============================================================================

import { investigationServiceSingleton } from '@/services/investigationService';
import { graphServiceSingleton } from '@/services/graphService';
import { closeDriver } from '@/db/neo4jDriver';

export async function seedDemoData() {
  console.log('🌱 Seeding EBRR Investigations Demo Data...');

  // ===========================================================================
  // TENANT 1: Alpha Compliance Corp
  // ===========================================================================
  const TENANT_ALPHA = 'tenant-alpha-compliance';
  const USER_ALPHA = 'user_sarah_01';

  console.log(`\n🏢 Seeding ${TENANT_ALPHA}...`);
  const invAlpha1 = await investigationServiceSingleton.createInvestigation(TENANT_ALPHA, USER_ALPHA, {
    name: 'Automated benefits eligibility denials',
    title: 'Automated benefits eligibility denials',
    description: 'Investigation into wrongful mass public assistance benefit terminations caused by automated fraud detection batch scoring workflow.',
    conductType: 'Ongoing practice',
    dateRange: 'Q1 2024 - Q3 2024',
    consequentialConduct: 'Over 14,000 low-income recipients experienced abrupt healthcare and nutritional benefit cutoffs without human review or notice.',
    knownPeopleOrgs: 'State Dept of Human Services, Apex Systems Integration LLC, Director David Vance',
    knownAiSystems: 'ClaimScorer Pro v2.4, EligibilityInference Engine',
  });

  // Additional elements and relationships for Matter 1
  const ruleWorkflow = await graphServiceSingleton.createNode(TENANT_ALPHA, USER_ALPHA, {
    workspaceId: invAlpha1.id,
    label: 'Nightly Batch Scoring Pipeline',
    nodeType: 'System',
    status: 'Active',
    citationsCount: 4,
    subtitle: 'Automated Cron Job',
    description: 'Runs nightly batch inference against active benefit recipient records',
    position: { x: 220, y: 160 },
    properties: { triggerFrequency: 'Daily 02:00 UTC', errorTolerance: '0%' },
  });

  const techDb = await graphServiceSingleton.createNode(TENANT_ALPHA, USER_ALPHA, {
    workspaceId: invAlpha1.id,
    label: 'Citizen Master Registry DB',
    nodeType: 'Organization',
    status: 'Verified',
    citationsCount: 8,
    subtitle: 'Relational Database',
    description: 'Primary state database storing citizen tax, earnings, and residency history',
    position: { x: 620, y: 160 },
    properties: { recordsCount: 2400000 },
  });

  const mlModel = await graphServiceSingleton.createNode(TENANT_ALPHA, USER_ALPHA, {
    workspaceId: invAlpha1.id,
    label: 'FraudAnomaly-XGBoost-v3',
    nodeType: 'System',
    status: 'Flagged',
    citationsCount: 12,
    subtitle: 'Trained Machine Learning Model',
    description: 'Binary classifier trained on historical disputed benefit claims',
    position: { x: 420, y: 380 },
    properties: { falsePositiveRate: '18.4%', lastAudited: '2022-11-01' },
  });

  // Relationships
  await graphServiceSingleton.createEdge(TENANT_ALPHA, {
    workspaceId: invAlpha1.id,
    sourceId: techDb.id,
    targetId: ruleWorkflow.id,
    type: 'PROVIDES_INPUT_TO',
    label: 'PROVIDES_INPUT_TO',
    directionality: 'single',
    lineStyle: 'solid',
    strokeColor: '#2563EB',
  });

  await graphServiceSingleton.createEdge(TENANT_ALPHA, {
    workspaceId: invAlpha1.id,
    sourceId: mlModel.id,
    targetId: ruleWorkflow.id,
    type: 'RELIES_ON',
    label: 'RELIES_ON',
    directionality: 'single',
    lineStyle: 'dashed',
    strokeColor: '#DC2626',
  });

  // Second Investigation for Alpha
  await investigationServiceSingleton.createInvestigation(TENANT_ALPHA, USER_ALPHA, {
    name: 'Biometric workplace surveillance & predictive firing',
    title: 'Biometric workplace surveillance & predictive firing',
    description: 'Assessment of automated computer-vision pacing software deployed across logistics fulfillment centers resulting in wrongful termination.',
    conductType: 'Systemic pattern',
    dateRange: '2023 - 2024',
    consequentialConduct: 'Discriminatory productivity threshold terminations targeting older warehouse personnel.',
    knownPeopleOrgs: 'PrimeLogistics Corp, VisionMetrics AI Ltd',
    knownAiSystems: 'EyePace Vision v1.2',
  });

  // ===========================================================================
  // TENANT 2: Lexis Integrity Partners
  // ===========================================================================
  const TENANT_LEXIS = 'tenant-lexis-integrity';
  const USER_LEXIS = 'user_marcus_02';

  console.log(`\n🏦 Seeding ${TENANT_LEXIS}...`);
  await investigationServiceSingleton.createInvestigation(TENANT_LEXIS, USER_LEXIS, {
    name: 'Algorithmic lending redlining & credit disparity',
    title: 'Algorithmic lending redlining & credit disparity',
    description: 'Class-action inquiry into automated mortgage underwriting models systematically assigning higher interest rates to minority zip codes.',
    conductType: 'Systemic pattern',
    dateRange: '2022 - 2024',
    consequentialConduct: 'Disparate impact violating Equal Credit Opportunity Act across 45,000 loan applicants.',
    knownPeopleOrgs: 'First National Digital Bank, CreditScoreAI Corp, CRO Robert Sterling',
    knownAiSystems: 'UnderwriteMax NeuralNet',
  });

  console.log('✅ EBRR Demo Seeding completed successfully!');
}

if (require.main === module) {
  seedDemoData()
    .then(() => closeDriver())
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
