import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { canListGovernmentAdminCustomers, isGovernmentAgencyCustomerManager } from './governmentAccess.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('government admin customers access context wiring', () => {
  it('admin customers route stays under GovernmentAdminAccessShell', () => {
    const routerSrc = readRepoFile('src/appRouter.tsx')
    const shellIdx = routerSrc.indexOf('element: <GovernmentAdminAccessShell />')
    const customersIdx = routerSrc.indexOf("path: 'government/admin/customers'")
    assert.ok(shellIdx >= 0, 'GovernmentAdminAccessShell route missing')
    assert.ok(customersIdx >= 0, 'government/admin/customers route missing')
    assert.ok(shellIdx < customersIdx, 'admin customers must be nested under GovernmentAdminAccessShell')
  })

  it('GovernmentAgencyAdminCustomersWorkspaceLayout wraps workspace with GovernmentAccessProvider', () => {
    const layoutSrc = readRepoFile(
      'src/features/government-support/pages/workspace/GovernmentProfileWorkspaceLayoutCore.tsx',
    )
    assert.match(
      layoutSrc,
      /export function GovernmentAgencyAdminCustomersWorkspaceLayout\(\)[\s\S]*<GovernmentAccessProvider token=\{token\}>[\s\S]*GovernmentProfileWorkspaceLayoutCore/,
      'admin customers workspace must render inside GovernmentAccessProvider',
    )
  })

  it('admin list state hook uses shared access (no strict context-only call)', () => {
    const hookSrc = readRepoFile(
      'src/features/government-support/hooks/useGovernmentAgencyAdminListState.ts',
    )
    assert.match(hookSrc, /useGovernmentAccessShared\(token\)/)
    assert.doesNotMatch(hookSrc, /useGovernmentAccessContext\(/)
  })

  it('user my-applications route remains on program-user workspace shell', () => {
    const routerSrc = readRepoFile('src/appRouter.tsx')
    assert.match(routerSrc, /path: 'government\/my-applications'[\s\S]*GovernmentProfileWorkspaceLayout/)
  })

  it('admin customers nested tab routes are registered', () => {
    const routerSrc = readRepoFile('src/appRouter.tsx')
    const customersBlock = routerSrc.slice(
      routerSrc.indexOf("path: 'government/admin/customers'"),
      routerSrc.indexOf("path: 'government/admin/program-users/:userId'"),
    )
    assert.match(customersBlock, /path: ':profileId\/:tab'/)
    assert.match(customersBlock, /GovernmentProfileWorkspaceTabPage/)
  })
})

describe('government admin customers access policy', () => {
  it('staff cannot list admin customers', () => {
    const staffCtx = {
      userId: 'staff-1',
      governmentAgencyAdminTenantIds: [],
      governmentStaffTenantIds: ['tenant-1'],
      governmentProgramUserTenantIds: [],
      governmentIndustryAdminIndustryIds: [],
    }
    assert.equal(isGovernmentAgencyCustomerManager(staffCtx), false)
    assert.equal(canListGovernmentAdminCustomers(staffCtx), false)
  })

  it('agency admin can list admin customers within tenant scope', () => {
    const agencyAdminCtx = {
      userId: 'admin-1',
      governmentAgencyAdminTenantIds: ['tenant-1'],
      governmentStaffTenantIds: [],
      governmentProgramUserTenantIds: [],
      governmentIndustryAdminIndustryIds: [],
    }
    assert.equal(isGovernmentAgencyCustomerManager(agencyAdminCtx), true)
    assert.equal(canListGovernmentAdminCustomers(agencyAdminCtx), true)
  })
})
