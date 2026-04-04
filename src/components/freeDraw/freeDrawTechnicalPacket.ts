import { buildFreeDrawFacadePrintHtml } from "./freeDrawFacadePrint";
import { buildFreeDrawPlanPrintHtml, type FreeDrawPlanRoom } from "./freeDrawPrint";
import type { FreeDrawEntity, FreeDrawOpeningEntity, FreeDrawWallEntity } from "./freeDrawTools";

export type FreeDrawFacadePacketItem = {
  title: string;
  wall: FreeDrawWallEntity;
  openings: FreeDrawOpeningEntity[];
};

function extractStyles(html: string) {
  return Array.from(html.matchAll(/<style>([\s\S]*?)<\/style>/g)).map((match) => match[1] ?? "");
}

function extractPages(html: string) {
  return Array.from(html.matchAll(/<section class="page">[\s\S]*?<\/section>/g)).map((match) => match[0] ?? "");
}

export function buildFreeDrawTechnicalPacketHtml(
  entities: FreeDrawEntity[],
  rooms: FreeDrawPlanRoom[],
  facades: FreeDrawFacadePacketItem[]
) {
  const planHtml = buildFreeDrawPlanPrintHtml(entities, rooms);
  const facadeHtmlList = facades.map((facade) => buildFreeDrawFacadePrintHtml(facade.wall, facade.openings, facade.title));
  const styles = [planHtml, ...facadeHtmlList]
    .flatMap(extractStyles)
    .filter(Boolean)
    .join("\n");
  const pages = [planHtml, ...facadeHtmlList].flatMap(extractPages).join("\n");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Serbest Cizim Teknik Paket</title>
      <style>${styles}</style>
    </head>
    <body>
      ${pages}
    </body>
  </html>
  `;
}
