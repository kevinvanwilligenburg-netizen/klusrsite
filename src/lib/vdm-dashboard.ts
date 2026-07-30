/**
 * Basis-URL van het VDM-dashboard.
 *
 * **Bewust het canonieke projectdomein en niet de kale alias.** Op 30-07-2026
 * bleek `dashboardvdm.vercel.app` vast te hangen op een deployment van elf
 * versies terug: elke nieuwe build slaagde en stond op READY, maar het domein
 * bleef `dpl_ZnX2v6ny…` serveren. Nieuwe endpoints (`/api/mengverf`,
 * `/api/feed-links`) gaven daar 404 terwijl het canonieke domein 200 gaf; het
 * deployment-id staat in de HTML van die 404-pagina's, dus het is hard
 * aantoonbaar. Het ziet eruit als een terugrol die nooit vooruit is gezet.
 *
 * Het canonieke domein volgt de productie-deploy altijd; de alias deed dat op
 * één dag twee keer niet. Ook ná herstel blijft dit dus de veiligere keuze —
 * een oude build geeft niet alleen 404's op nieuwe endpoints, maar ook stille
 * verouderde data op de bestaande.
 *
 * Te overschrijven met NEXT_PUBLIC_KLEURENKIEZER_API (historische naam; die
 * env-var zet de basis voor álle dashboard-endpoints, niet alleen de
 * kleurenkiezer).
 */
export const VDM_DASHBOARD_BASE = (
  process.env.NEXT_PUBLIC_KLEURENKIEZER_API || "https://dashboardvdm-k-evin-s-projects.vercel.app"
).replace(/\/+$/, "");
