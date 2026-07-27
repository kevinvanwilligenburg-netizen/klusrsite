import { z } from "zod";

/**
 * Validatie van een winkelwagenregel zoals de checkout-routes 'm binnenkrijgen.
 *
 * Eén gedeelde bron voor alle betaalroutes (checkout, express, Apple Pay): zod
 * strípt onbekende velden, dus een veld dat hier ontbreekt bestaat verderop
 * niet meer — ook niet op de order die we opslaan. Dat ging eerder mis met de
 * tinting-basis van mengverf: de klant betaalde de toeslag, maar welke basis
 * verkocht was verdween uit de order én uit de voorraadcontrole.
 */
export const cartItemSchema = z.object({
  key: z.string(),
  productId: z.string(),
  variantId: z.string(),
  title: z.string(),
  brand: z.string(),
  image: z.string(),
  variantLabel: z.string(),
  slug: z.string(),
  quantity: z.number().int().positive(),
  price: z.number(),
  kluspasPrice: z.number(),
  selectedColor: z
    .object({
      name: z.string(),
      code: z.string(),
      hex: z.string(),
      collection: z.string().optional(),
      /** Herkomst van de kleur (kleurenportal), voor zoeken/filteren. */
      provider: z.string().optional(),
      /** Tinting-basis: bepaalt de toeslag én uit welk blik geschept wordt. */
      base: z
        .object({
          id: z.enum(["wit", "medium", "deep"]),
          label: z.string(),
          surcharge: z.number(),
        })
        .optional(),
    })
    .optional(),
});

export type CheckoutCartItem = z.infer<typeof cartItemSchema>;
