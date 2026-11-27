import { lazy, Suspense } from 'react'
import { WorkspaceDemoCopy } from '@/components/workspace/templates/demo-copy'

const shells = {
  dashboard: lazy(() => import('@/components/application/dashboard/dashboard-shell').then(m => ({ default: m.DashboardShell }))),
  marketing: lazy(() => import('@/components/application/marketing/marketing-shell').then(m => ({ default: m.MarketingShell }))),
  finance: lazy(() => import('@/components/application/finance/finance-shell').then(m => ({ default: m.FinanceShell }))),
  hr: lazy(() => import('@/components/application/hr/hr-shell').then(m => ({ default: m.HrShell }))),
  'medical-profile': lazy(() => import('@/components/application/medical/medical-shell').then(m => ({ default: m.MedicalShell }))),
}

export default function TemplateDetail({ slug }: { slug: keyof typeof shells }) {
  const Shell = shells[slug]
  return <section className="workspace-template flex h-full min-h-0 flex-col bg-background-full text-text-primary">
    <div className="min-h-0 flex-1 overflow-hidden">
      <Suspense fallback={null}><WorkspaceDemoCopy><Shell contained /></WorkspaceDemoCopy></Suspense>
    </div>
  </section>
}
