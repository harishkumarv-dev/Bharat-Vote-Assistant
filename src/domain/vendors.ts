import { VENDOR_CATEGORIES, vendorCategory } from './catalog';
import type { EventPlan, Vendor, VendorStats, VendorStatus } from '../types';
import { cleanText, createId } from '../utils';

export interface VendorInput {
  name: string;
  category: string;
  status?: VendorStatus;
  quote?: number | null;
  contactName?: string;
  email?: string;
  phone?: string;
  followUp?: string;
  notes?: string;
}

export function defaultVendorChecklist(
  type: EventPlan['type'],
  categoryId: string,
): Vendor['checklist'] {
  const category = vendorCategory(type, categoryId);
  return (category?.questions ?? []).map((question) => ({
    id: createId('check'),
    label: question,
    done: false,
  }));
}

export function createVendor(type: EventPlan['type'], input: VendorInput): Vendor {
  return {
    id: createId('vendor'),
    name: cleanText(input.name, 100),
    category: input.category,
    status: input.status ?? 'researching',
    quote:
      input.quote === null || input.quote === undefined || !Number.isFinite(input.quote)
        ? null
        : Math.max(0, Math.round(input.quote)),
    contactName: cleanText(input.contactName ?? '', 80),
    email: cleanText(input.email ?? '', 120),
    phone: cleanText(input.phone ?? '', 40),
    followUp: cleanText(input.followUp ?? '', 10),
    notes: cleanText(input.notes ?? '', 500),
    checklist: defaultVendorChecklist(type, input.category),
  };
}

export function computeVendorStats(event: EventPlan): VendorStats {
  const categoryDefs = VENDOR_CATEGORIES[event.type];
  const categories = categoryDefs.map((category) => {
    const vendors = event.vendors.filter((vendor) => vendor.category === category.id);
    return {
      id: category.id,
      label: category.label,
      essential: category.essential,
      booked: vendors.some((vendor) => vendor.status === 'booked'),
      vendorCount: vendors.length,
    };
  });

  const essential = categories.filter((category) => category.essential);
  return {
    categories,
    essentialTotal: essential.length,
    essentialBooked: essential.filter((category) => category.booked).length,
    booked: event.vendors.filter((vendor) => vendor.status === 'booked').length,
    quoted: event.vendors.filter((vendor) => vendor.status === 'quoted').length,
    contacted: event.vendors.filter((vendor) => vendor.status === 'contacted').length,
    researching: event.vendors.filter((vendor) => vendor.status === 'researching').length,
    declined: event.vendors.filter((vendor) => vendor.status === 'declined').length,
    quotedValue: event.vendors.reduce(
      (total, vendor) => total + (vendor.quote !== null ? vendor.quote : 0),
      0,
    ),
  };
}

export function missingEssentialVendors(stats: VendorStats): VendorStats['categories'] {
  return stats.categories.filter((category) => category.essential && !category.booked);
}

export function vendorCategoryLabel(type: EventPlan['type'], categoryId: string): string {
  return vendorCategory(type, categoryId)?.label ?? 'Other';
}

/** A short, safe email draft for a vendor; used by the local coach. */
export function draftVendorEmail(
  event: EventPlan,
  vendor: Vendor,
  extra?: string,
): { subject: string; body: string } {
  const category = vendorCategoryLabel(event.type, vendor.category).toLowerCase();
  const subject = `${event.basics.name} — ${category} enquiry`;
  const lines = [
    `Hi ${vendor.contactName || vendor.name},`,
    '',
    `I'm planning ${event.basics.name} on ${event.basics.date}${event.basics.location ? ` in ${event.basics.location}` : ''}. We're expecting about ${event.basics.guestCount} guests and would love to understand whether you're available.`,
    '',
    `Could you share:`,
    `• Availability for our date`,
    `• A sample quote or starting package`,
    `• Any accessibility or dietary considerations we should plan for`,
    `• Your cancellation and payment terms`,
  ];
  if (extra && extra.trim()) {
    lines.push('', extra.trim());
  }
  lines.push(
    '',
    'If it is useful, I can send a short brief with our priorities and budget range.',
    '',
    'Thank you,',
    '[Your name]',
  );
  return { subject, body: lines.join('\n') };
}
