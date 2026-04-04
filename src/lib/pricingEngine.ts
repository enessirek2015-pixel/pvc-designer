import type { PvcDesign } from "../types/pvc";
import type { ManufacturingReport } from "./manufacturingEngine";

export interface PricingConfig {
  profilePricePerMeter: number;
  glassPricePerM2: number;
  hardwarePricePerSet: number;
  laborCostPercent: number;
  profitMarginPercent: number;
  currencySymbol: string;
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  validityDays: number;
}

export interface PricingLineItem {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PricingReport {
  lineItems: PricingLineItem[];
  materialCost: number;
  laborCost: number;
  subtotal: number;
  profitAmount: number;
  grandTotal: number;
  currencySymbol: string;
  pricePerM2: number;
}

export const defaultPricingConfig: PricingConfig = {
  profilePricePerMeter: 120,
  glassPricePerM2: 280,
  hardwarePricePerSet: 450,
  laborCostPercent: 30,
  profitMarginPercent: 20,
  currencySymbol: "TRY",
  companyName: "PVC Designer Studio",
  companyTagline: "PVC pencere ve kapi sistemleri",
  companyPhone: "",
  companyEmail: "",
  companyAddress: "",
  validityDays: 30
};

function currencyLabel(symbol: string) {
  if (symbol === "EUR" || symbol === "€") {
    return "EUR";
  }
  if (symbol === "USD" || symbol === "$") {
    return "USD";
  }
  if (symbol === "GBP" || symbol === "£") {
    return "GBP";
  }
  return "TRY";
}

function currencyMark(symbol: string) {
  if (symbol === "EUR" || symbol === "€") {
    return "EUR";
  }
  if (symbol === "USD" || symbol === "$") {
    return "$";
  }
  if (symbol === "GBP" || symbol === "£") {
    return "GBP";
  }
  return "TRY";
}

export function buildPricingReport(
  design: PvcDesign,
  report: ManufacturingReport,
  config: PricingConfig = defaultPricingConfig
): PricingReport {
  const lineItems: PricingLineItem[] = [];
  const sym = currencyMark(config.currencySymbol);

  const profileTotal = report.profileLengthMeters * config.profilePricePerMeter;
  lineItems.push({
    label: "Profil (kasa + kayit + kanat + cita)",
    quantity: report.profileLengthMeters,
    unit: "m",
    unitPrice: config.profilePricePerMeter,
    totalPrice: profileTotal
  });

  const glassTotal = report.glassAreaM2 * config.glassPricePerM2;
  lineItems.push({
    label: "Cam",
    quantity: report.glassAreaM2,
    unit: "m2",
    unitPrice: config.glassPricePerM2,
    totalPrice: glassTotal
  });

  const totalSets = report.openingPanels;
  if (totalSets > 0) {
    const hardwareTotal = totalSets * config.hardwarePricePerSet;
    lineItems.push({
      label: "Donanim (mentese, kol, kilit)",
      quantity: totalSets,
      unit: "set",
      unitPrice: config.hardwarePricePerSet,
      totalPrice: hardwareTotal
    });
  }

  const materialCost = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const laborCost = materialCost * (config.laborCostPercent / 100);
  const subtotal = materialCost + laborCost;
  const profitAmount = subtotal * (config.profitMarginPercent / 100);
  const grandTotal = subtotal + profitAmount;
  const totalAreaM2 = (design.totalWidth / 1000) * (design.totalHeight / 1000);
  const pricePerM2 = totalAreaM2 > 0 ? grandTotal / totalAreaM2 : 0;

  return {
    lineItems,
    materialCost,
    laborCost,
    subtotal,
    profitAmount,
    grandTotal,
    currencySymbol: sym,
    pricePerM2
  };
}

export function buildQuoteHtml(
  design: PvcDesign,
  report: ManufacturingReport,
  pricing: PricingReport,
  config: PricingConfig = defaultPricingConfig,
  options?: {
    previewSvg?: string;
  }
): string {
  const sym = pricing.currencySymbol;
  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalAreaM2 = ((design.totalWidth / 1000) * (design.totalHeight / 1000)).toFixed(2);
  const validUntil = new Date(Date.now() + Math.max(1, config.validityDays) * 86_400_000).toLocaleDateString("tr-TR");
  const previewMarkup = options?.previewSvg ?? "<div style=\"color:#8a96a8; font-size:12px;\">Onizleme yok</div>";

  const lineRows = pricing.lineItems
    .map(
      (item) => `<tr>
      <td>${item.label}</td>
      <td style="text-align:right">${item.quantity.toFixed(2)} ${item.unit}</td>
      <td style="text-align:right">${sym} ${fmt(item.unitPrice)}</td>
      <td style="text-align:right"><strong>${sym} ${fmt(item.totalPrice)}</strong></td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <title>Teklif - ${design.name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 32px; color: #1a2332; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 20px; }
    .brand { font-size: 26px; font-weight: 800; color: #173e72; }
    .brand span { color: #e88b2d; }
    .brand small { display:block; margin-top:6px; color:#718095; font-size:13px; font-weight:600; }
    .doc-title { font-size: 13px; color: #6b7a8d; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
    .info-block { padding: 16px 20px; border-radius: 12px; background: #f4f7fb; }
    .info-block h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; color: #8a96a8; letter-spacing: 0.1em; }
    .info-row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 6px; font-size: 14px; }
    .info-row strong { color: #1a2332; text-align:right; }
    .preview-shell { margin-bottom: 24px; padding: 18px; border-radius: 14px; background: #f8fbff; border: 1px solid #e4ebf5; }
    .preview-shell h3 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; color: #8a96a8; letter-spacing: 0.1em; }
    .preview-frame { display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 18px; }
    .preview-box { background: #ffffff; border: 1px solid #dfe7f1; border-radius: 12px; padding: 12px; min-height: 220px; display:flex; align-items:center; justify-content:center; }
    .preview-box svg { max-width: 100%; height: auto; }
    .meta-stack { display: grid; gap: 10px; }
    .meta-chip { padding: 10px 12px; border-radius: 10px; background: #fff; border: 1px solid #dfe7f1; font-size: 12px; color: #415266; line-height: 1.55; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #173e72; color: #d8e8ff; text-align: left; padding: 12px 14px; font-size: 13px; }
    td { padding: 11px 14px; border-bottom: 1px solid #e8edf4; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    .summary { display: flex; justify-content: flex-end; }
    .summary-box { width: 380px; }
    .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #e8edf4; }
    .summary-row.total { font-size: 18px; font-weight: 800; color: #173e72; border-bottom: none; margin-top: 8px; padding-top: 12px; }
    .badge-row { display: flex; gap: 10px; margin-top: 24px; flex-wrap: wrap; }
    .badge { padding: 8px 14px; border-radius: 999px; background: #eef2ff; font-size: 12px; font-weight: 700; color: #2a4a8a; }
    .footer { margin-top: 32px; font-size: 11px; color: #a0aab8; border-top: 1px solid #e8edf4; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${config.companyName}<span> Quote</span><small>${config.companyTagline || "PVC pencere ve kapi sistemleri"}</small></div>
      <div class="doc-title">Fiyat Teklifi</div>
    </div>
    <div style="text-align:right; font-size:13px; color:#6b7a8d;">
      <div><strong>${design.name}</strong></div>
      <div>Tarih: ${new Date().toLocaleDateString("tr-TR")}</div>
      <div>Gecerlilik: ${validUntil}</div>
      <div>Para Birimi: ${currencyLabel(config.currencySymbol)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <h3>Musteri</h3>
      <div class="info-row"><span>Ad</span><strong>${design.customer.customerName || "-"}</strong></div>
      <div class="info-row"><span>Proje Kodu</span><strong>${design.customer.projectCode || "-"}</strong></div>
      <div class="info-row"><span>Adres</span><strong>${design.customer.address || "-"}</strong></div>
    </div>
    <div class="info-block">
      <h3>Firma</h3>
      <div class="info-row"><span>Telefon</span><strong>${config.companyPhone || "-"}</strong></div>
      <div class="info-row"><span>E-posta</span><strong>${config.companyEmail || "-"}</strong></div>
      <div class="info-row"><span>Adres</span><strong>${config.companyAddress || "-"}</strong></div>
    </div>
  </div>

  <div class="preview-shell">
    <h3>Tasarim Onizlemesi</h3>
    <div class="preview-frame">
      <div class="preview-box">${previewMarkup}</div>
      <div class="meta-stack">
        <div class="meta-chip"><strong>Boyut</strong><br/>${design.totalWidth} x ${design.totalHeight} mm</div>
        <div class="meta-chip"><strong>Alan</strong><br/>${totalAreaM2} m2</div>
        <div class="meta-chip"><strong>Cam Alani</strong><br/>${report.glassAreaM2.toFixed(2)} m2</div>
        <div class="meta-chip"><strong>Acilir Kanat</strong><br/>${report.openingPanels} adet</div>
      </div>
    </div>
  </div>

  <table>
    <thead><tr><th>Kalem</th><th style="text-align:right">Miktar</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Toplam</th></tr></thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-row"><span>Malzeme Maliyeti</span><span>${sym} ${fmt(pricing.materialCost)}</span></div>
      <div class="summary-row"><span>Iscilik</span><span>${sym} ${fmt(pricing.laborCost)}</span></div>
      <div class="summary-row"><span>Ara Toplam</span><span>${sym} ${fmt(pricing.subtotal)}</span></div>
      <div class="summary-row"><span>Kar Marji</span><span>${sym} ${fmt(pricing.profitAmount)}</span></div>
      <div class="summary-row total"><span>GENEL TOPLAM</span><span>${sym} ${fmt(pricing.grandTotal)}</span></div>
    </div>
  </div>

  <div class="badge-row">
    <div class="badge">m2 Birim Fiyat: ${sym} ${fmt(pricing.pricePerM2)}/m2</div>
    <div class="badge">Profil: ${report.profileLengthMeters.toFixed(2)} m</div>
    <div class="badge">Cam: ${report.glassAreaM2.toFixed(2)} m2</div>
  </div>

  <div class="footer">Bu teklif ${config.companyName} tarafindan hazirlanmistir. Fiyatlar KDV harictir. Teklif gecerlilik suresi ${Math.max(1, config.validityDays)} gundur.</div>
</body>
</html>`;
}
