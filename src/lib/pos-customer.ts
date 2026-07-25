import { listOrders } from "@/lib/store/orders";
import { getUser, createUser, createMagicToken } from "@/lib/store/users";
import { getProfile, saveProfile } from "@/lib/store/profile";
import { sendMagicLink, isEmailConfigured } from "@/lib/email";
import type { PosCustomerMode } from "@/lib/pos";

/**
 * Omnichannel klantkoppeling voor de kassa.
 *
 * Een klant = een account (users-store, "KLUSRPAS") + een profiel (profile-store
 * met zakelijke velden, "ProfPas"). De kassa kan klanten opzoeken (uit eerdere
 * bestellingen + accounts), aanmaken en aan de verkoop koppelen — zodat een
 * winkelaankoop in dezelfde klanthistorie en hetzelfde account terechtkomt als
 * de webshop.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

export interface PosCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  cocNumber?: string;
  vatNumber?: string;
  /** Heeft een (KLUSRPAS-)account. */
  account: boolean;
  /** Zakelijk (ProfPas): heeft bedrijfsnaam/btw-nummer. */
  business: boolean;
  orderCount: number;
  lastOrderAt?: string;
}

/** Prijsmodus die bij het lidmaatschap van een klant past. */
export function membershipMode(c: {
  account?: boolean;
  business?: boolean;
}): PosCustomerMode {
  if (c.business) return "zakelijk";
  if (c.account) return "kluspas";
  return "particulier";
}

function splitName(name?: string): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Zoek klanten voor de kassa op e-mail/naam/telefoon. Bron: eerdere bestellingen
 * (samengevoegd per e-mailadres), verrijkt met account- en profielinfo. Een
 * volledig e-mailadres zonder bestellingen zoeken we ook rechtstreeks op.
 */
export async function searchCustomers(query: string, limit = 8): Promise<PosCustomer[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const orders = await listOrders();
  const byEmail = new Map<string, PosCustomer>();

  for (const o of orders) {
    const email = (o.customer.email || "").trim().toLowerCase();
    if (!email) continue;
    const hay = `${email} ${o.customer.firstName ?? ""} ${o.customer.lastName ?? ""} ${
      o.customer.phone ?? ""
    } ${o.customer.company ?? ""}`.toLowerCase();
    if (!hay.includes(q)) continue;

    const existing = byEmail.get(email);
    if (existing) {
      existing.orderCount += 1;
      if (!existing.lastOrderAt || o.createdAt > existing.lastOrderAt) {
        existing.lastOrderAt = o.createdAt;
      }
      existing.company = existing.company || o.customer.company;
      existing.vatNumber = existing.vatNumber || o.customer.vatNumber;
      existing.cocNumber = existing.cocNumber || o.customer.cocNumber;
      existing.phone = existing.phone || o.customer.phone;
      existing.business = existing.business || Boolean(o.customer.company || o.customer.vatNumber);
    } else {
      byEmail.set(email, {
        email,
        firstName: o.customer.firstName || "",
        lastName: o.customer.lastName || "",
        phone: o.customer.phone,
        company: o.customer.company,
        cocNumber: o.customer.cocNumber,
        vatNumber: o.customer.vatNumber,
        account: false,
        business: Boolean(o.customer.company || o.customer.vatNumber),
        orderCount: 1,
        lastOrderAt: o.createdAt,
      });
    }
  }

  let hits = [...byEmail.values()].sort((a, b) =>
    (b.lastOrderAt ?? "") < (a.lastOrderAt ?? "") ? -1 : 1,
  );

  // Exact e-mailadres dat (nog) geen bestellingen heeft → rechtstreeks ophalen.
  if (EMAIL_RE.test(q) && !byEmail.has(q)) {
    const [user, profile] = await Promise.all([getUser(q), getProfile(q)]);
    if (user || profile) {
      const name = splitName(profile?.name || user?.name);
      hits.unshift({
        email: q,
        firstName: name.firstName,
        lastName: name.lastName,
        phone: profile?.phone,
        company: profile?.company,
        cocNumber: profile?.cocNumber,
        vatNumber: profile?.vatNumber,
        account: Boolean(user),
        business: Boolean(profile?.company || profile?.vatNumber),
        orderCount: 0,
      });
    }
  }

  hits = hits.slice(0, limit);

  // Top-resultaten verrijken met account-/profielstatus (begrensd aantal calls).
  await Promise.all(
    hits.map(async (h) => {
      const [user, profile] = await Promise.all([getUser(h.email), getProfile(h.email)]);
      h.account = h.account || Boolean(user);
      if (profile) {
        h.company = h.company || profile.company;
        h.vatNumber = h.vatNumber || profile.vatNumber;
        h.cocNumber = h.cocNumber || profile.cocNumber;
        h.phone = h.phone || profile.phone;
        if (profile.name && !h.firstName && !h.lastName) {
          const n = splitName(profile.name);
          h.firstName = n.firstName;
          h.lastName = n.lastName;
        }
      }
      h.business = h.business || Boolean(h.company || h.vatNumber);
    }),
  );

  return hits;
}

export interface UpsertCustomerInput {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  cocNumber?: string;
  vatNumber?: string;
  /** Maak een (KLUSRPAS-)account aan zodat de klant ook online kan inloggen. */
  createAccount?: boolean;
  /** Stuur een inlog-/magic-link (alleen met e-mail geconfigureerd). */
  sendInvite?: boolean;
}

/**
 * Maak/werk een klant bij vanuit de kassa: profiel opslaan (incl. zakelijke
 * velden = ProfPas) en desgewenst een KLUSRPAS-account aanmaken + inlogmail. Geeft
 * de genormaliseerde klant terug. Best-effort op de e-mail/account-bijwerking.
 */
export async function upsertPosCustomer(
  input: UpsertCustomerInput,
): Promise<{ ok: boolean; error?: string; customer?: PosCustomer; accountCreated?: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Ongeldig e-mailadres." };

  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const business = Boolean(input.company?.trim() || input.vatNumber?.trim());

  let accountCreated = false;
  let hadAccount = Boolean(await getUser(email));
  if (input.createAccount && !hadAccount) {
    const r = await createUser({ email, name, verified: true });
    accountCreated = r.ok;
    hadAccount = hadAccount || r.ok;
  }

  await saveProfile(email, {
    name: name || undefined,
    phone: input.phone,
    company: input.company,
    cocNumber: input.cocNumber,
    vatNumber: input.vatNumber,
  });

  if (input.sendInvite && isEmailConfigured()) {
    try {
      const token = await createMagicToken(email);
      await sendMagicLink({ email, name, url: `${SITE_URL}/inloggen/magic?token=${token}` });
    } catch {
      /* invite is best-effort */
    }
  }

  return {
    ok: true,
    accountCreated,
    customer: {
      email,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone?.trim() || undefined,
      company: input.company?.trim() || undefined,
      cocNumber: input.cocNumber?.trim() || undefined,
      vatNumber: input.vatNumber?.trim() || undefined,
      account: hadAccount,
      business,
      orderCount: 0,
    },
  };
}

/**
 * Leg een aan een kassaverkoop gekoppelde klant vast (profiel bijwerken, evt.
 * account aanmaken). Aangeroepen bij het afrekenen zodat een aan de balie
 * gekoppelde klant ook echt in de klanthistorie/het account belandt.
 */
export async function persistOrderCustomer(
  customer: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    cocNumber?: string;
    vatNumber?: string;
  },
  createAccount?: boolean,
): Promise<void> {
  const email = (customer.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return;
  try {
    await upsertPosCustomer({
      email,
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone,
      company: customer.company,
      cocNumber: customer.cocNumber,
      vatNumber: customer.vatNumber,
      createAccount,
    });
  } catch {
    /* nooit de afrekenflow breken */
  }
}
