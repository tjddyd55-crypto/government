import {
  GOVERNMENT_ADMIN_SIGNATURE_PDF_NEW_PATH,
  GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH,
  type GovernmentAdminNavItem,
} from './governmentAdminNav'

export function isGovernmentSignatureTemplatesNavActive(pathname: string): boolean {
  if (!pathname.startsWith(GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH)) {
    return false
  }
  return !pathname.startsWith(`${GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH}/pdf`)
}

export function isGovernmentSignaturePdfNavActive(pathname: string): boolean {
  return pathname.startsWith(`${GOVERNMENT_ADMIN_SIGNATURE_TEMPLATES_PATH}/pdf`)
}

export function isGovernmentAdminNavItemActive(pathname: string, item: GovernmentAdminNavItem): boolean {
  if (item.isActive) {
    return item.isActive(pathname)
  }
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`)
  }
  if (item.end) {
    return pathname === item.to
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
