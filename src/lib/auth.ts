import { cookies } from "next/headers";

export interface TenantContext {
  businessId: string;
  businessName: string;
  businessSlug: string;
  userId: string;
  userEmail: string;
  userRole: "owner" | "admin" | "member";
}

export const DEMO_BUSINESSES: Record<string, TenantContext> = {
  "acme-corp": {
    businessId: "11111111-1111-4111-8111-111111111111",
    businessName: "Acme Corporation",
    businessSlug: "acme-corp",
    userId: "aaaaaaaa-1111-4111-8111-111111111111",
    userEmail: "alex@acme.com",
    userRole: "owner",
  },
  "beta-dynamics": {
    businessId: "22222222-2222-4222-8222-222222222222",
    businessName: "Beta Dynamics",
    businessSlug: "beta-dynamics",
    userId: "bbbbbbbb-2222-4222-8222-222222222222",
    userEmail: "sarah@beta-tech.com",
    userRole: "owner",
  },
};

export const DEFAULT_TENANT = DEMO_BUSINESSES["acme-corp"];

/**
 * Resolves the authenticated business tenant context.
 * Reads active tenant from request cookie or header, falling back to Acme Corporation demo.
 */
export async function getTenantContext(): Promise<TenantContext> {
  try {
    const cookieStore = await cookies();
    const slug = cookieStore.get("active_tenant_slug")?.value;
    if (slug && DEMO_BUSINESSES[slug]) {
      return DEMO_BUSINESSES[slug];
    }
  } catch {
    // If called outside request context (e.g., in unit tests or background jobs)
  }
  return DEFAULT_TENANT;
}
