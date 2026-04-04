import type { GlassType, HardwareQuality, MaterialSystem, ProfileSeries, PvcDesign } from "../types/pvc";

export interface CustomerQuoteRecord {
  id: string;
  projectId: string;
  designId: string;
  designName: string;
  projectCode: string;
  quotedAt: string;
  total: number;
  currencySymbol: string;
}

export interface CustomerProjectRecord {
  id: string;
  designId: string;
  name: string;
  projectCode: string;
  updatedAt: string;
  width: number;
  height: number;
  panelCount: number;
  openingCount: number;
  materialSystem: MaterialSystem;
  profileSeries: ProfileSeries;
  glassType: GlassType;
  hardwareQuality: HardwareQuality;
  projectPath?: string;
  quoteTotal?: number;
  quoteCurrencySymbol?: string;
  lastQuotedAt?: string;
  quoteHistory: CustomerQuoteRecord[];
  snapshot?: PvcDesign;
}

export interface CustomerRegistryEntry {
  id: string;
  customerName: string;
  address: string;
  notes: string;
  projectCode: string;
  lastWorkedAt: string;
  lastQuoteTotal?: number;
  lastQuoteCurrencySymbol?: string;
  lastQuotedAt?: string;
  quoteCount: number;
  projects: CustomerProjectRecord[];
}

function normalizeKeyPart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function cloneDesignSnapshot(design: PvcDesign): PvcDesign {
  return {
    ...design,
    materials: { ...design.materials },
    customer: { ...design.customer },
    projectLink: design.projectLink ? { ...design.projectLink } : undefined,
    revisionHistory: design.revisionHistory?.map((entry) => ({ ...entry })) ?? [],
    guides: (design.guides ?? []).map((guide) => ({ ...guide })),
    transoms: design.transoms.map((transom) => ({
      ...transom,
      panels: transom.panels.map((panel) => ({ ...panel }))
    }))
  };
}

function countPanels(design: PvcDesign) {
  return design.transoms.reduce((sum, transom) => sum + transom.panels.length, 0);
}

function countOpeningPanels(design: PvcDesign) {
  return design.transoms.reduce(
    (sum, transom) => sum + transom.panels.filter((panel) => panel.openingType !== "fixed").length,
    0
  );
}

function normalizeQuoteRecord(projectId: string, project: CustomerProjectRecord, quote: Partial<CustomerQuoteRecord>): CustomerQuoteRecord {
  return {
    id: quote.id ?? `${projectId}-quote-${quote.quotedAt ?? project.updatedAt}`,
    projectId,
    designId: quote.designId ?? project.designId,
    designName: quote.designName ?? project.name,
    projectCode: quote.projectCode ?? project.projectCode,
    quotedAt: quote.quotedAt ?? project.updatedAt,
    total: Number(quote.total ?? project.quoteTotal ?? 0),
    currencySymbol: quote.currencySymbol ?? project.quoteCurrencySymbol ?? "TRY"
  };
}

function normalizeProjectRecord(project: CustomerProjectRecord): CustomerProjectRecord {
  const normalizedQuoteHistory = (project.quoteHistory ?? [])
    .map((quote) => normalizeQuoteRecord(project.id, project, quote))
    .sort((left, right) => right.quotedAt.localeCompare(left.quotedAt))
    .slice(0, 10);

  return {
    ...project,
    panelCount: project.panelCount ?? 0,
    openingCount: project.openingCount ?? 0,
    materialSystem: project.materialSystem ?? "system-series",
    profileSeries: project.profileSeries ?? "comfort-70",
    glassType: project.glassType ?? "double-clear",
    hardwareQuality: project.hardwareQuality ?? "standard",
    quoteHistory: normalizedQuoteHistory,
    snapshot: project.snapshot ? cloneDesignSnapshot(project.snapshot) : undefined,
    lastQuotedAt: project.lastQuotedAt ?? normalizedQuoteHistory[0]?.quotedAt,
    quoteCurrencySymbol: project.quoteCurrencySymbol ?? normalizedQuoteHistory[0]?.currencySymbol,
    quoteTotal:
      project.quoteTotal ??
      normalizedQuoteHistory[0]?.total
  };
}

export function normalizeCustomerRegistry(entries: CustomerRegistryEntry[] | null | undefined) {
  if (!Array.isArray(entries)) {
    return [] as CustomerRegistryEntry[];
  }

  return entries
    .map((entry) => {
      const projects = (entry.projects ?? []).map((project) =>
        normalizeProjectRecord(project as CustomerProjectRecord)
      );
      const quoteRecords = projects.flatMap((project) => project.quoteHistory);
      const sortedQuotes = [...quoteRecords].sort((left, right) => right.quotedAt.localeCompare(left.quotedAt));

      return {
        ...entry,
        projects,
        quoteCount: entry.quoteCount ?? quoteRecords.length,
        lastQuotedAt: entry.lastQuotedAt ?? sortedQuotes[0]?.quotedAt,
        lastQuoteTotal: entry.lastQuoteTotal ?? sortedQuotes[0]?.total,
        lastQuoteCurrencySymbol: entry.lastQuoteCurrencySymbol ?? sortedQuotes[0]?.currencySymbol
      };
    })
    .sort((left, right) => right.lastWorkedAt.localeCompare(left.lastWorkedAt));
}

export function buildCustomerRegistryId(customerName: string, address: string) {
  const namePart = normalizeKeyPart(customerName || "musteri");
  const addressPart = normalizeKeyPart(address || "adres");
  return `${namePart}__${addressPart}`;
}

export function upsertCustomerRegistryEntry(
  entries: CustomerRegistryEntry[],
  design: PvcDesign,
  options?: {
    projectPath?: string;
    quoteTotal?: number;
    quoteCurrencySymbol?: string;
    savedAt?: string;
    persistSnapshot?: boolean;
  }
) {
  const customerName = design.customer.customerName.trim();
  const address = design.customer.address.trim();
  if (!customerName && !address) {
    return entries;
  }

  const normalizedEntries = normalizeCustomerRegistry(entries);
  const id = buildCustomerRegistryId(customerName || design.name, address);
  const savedAt = options?.savedAt ?? new Date().toISOString();
  const projectId = options?.projectPath || design.id || design.customer.projectCode || design.name;
  const current = normalizedEntries.find((entry) => entry.id === id);
  const currentProject = current?.projects.find((project) => project.id === projectId);

  const nextQuote =
    typeof options?.quoteTotal === "number"
      ? normalizeQuoteRecord(
          projectId,
          {
            ...(currentProject ?? {
              id: projectId,
              designId: design.id,
              name: design.name,
              projectCode: design.customer.projectCode,
              updatedAt: savedAt,
              width: design.totalWidth,
              height: design.totalHeight,
              panelCount: countPanels(design),
              openingCount: countOpeningPanels(design),
              materialSystem: design.materials.materialSystem,
              profileSeries: design.materials.profileSeries,
              glassType: design.materials.glassType,
              hardwareQuality: design.materials.hardwareQuality,
              quoteHistory: []
            })
          } as CustomerProjectRecord,
          {
            id: `${projectId}-${savedAt}`,
            designId: design.id,
            designName: design.name,
            projectCode: design.customer.projectCode,
            quotedAt: savedAt,
            total: options.quoteTotal,
            currencySymbol: options.quoteCurrencySymbol ?? "TRY"
          }
        )
      : null;

  const nextProject: CustomerProjectRecord = normalizeProjectRecord({
    id: projectId,
    designId: design.id,
    name: design.name,
    projectCode: design.customer.projectCode,
    updatedAt: savedAt,
    width: design.totalWidth,
    height: design.totalHeight,
    panelCount: countPanels(design),
    openingCount: countOpeningPanels(design),
    materialSystem: design.materials.materialSystem,
    profileSeries: design.materials.profileSeries,
    glassType: design.materials.glassType,
    hardwareQuality: design.materials.hardwareQuality,
    projectPath: options?.projectPath ?? currentProject?.projectPath,
    quoteTotal: typeof options?.quoteTotal === "number" ? options.quoteTotal : currentProject?.quoteTotal,
    quoteCurrencySymbol:
      options?.quoteCurrencySymbol ??
      currentProject?.quoteCurrencySymbol,
    lastQuotedAt: nextQuote?.quotedAt ?? currentProject?.lastQuotedAt,
    quoteHistory: nextQuote
      ? [nextQuote, ...(currentProject?.quoteHistory ?? [])]
      : (currentProject?.quoteHistory ?? []),
    snapshot: options?.persistSnapshot === false
      ? currentProject?.snapshot
      : cloneDesignSnapshot(design)
  });

  const nextProjects = [
    nextProject,
    ...(current?.projects ?? []).filter((project) => project.id !== projectId).map((project) =>
      normalizeProjectRecord(project)
    )
  ]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 12);

  const quoteRecords = nextProjects.flatMap((project) => project.quoteHistory);
  const sortedQuotes = [...quoteRecords].sort((left, right) => right.quotedAt.localeCompare(left.quotedAt));

  const nextEntry: CustomerRegistryEntry = {
    id,
    customerName: customerName || current?.customerName || design.name,
    address: address || current?.address || "",
    notes: design.customer.notes.trim() || current?.notes || "",
    projectCode: design.customer.projectCode.trim() || current?.projectCode || "",
    lastWorkedAt: savedAt,
    lastQuoteTotal: nextProject.quoteTotal ?? current?.lastQuoteTotal,
    lastQuoteCurrencySymbol: nextProject.quoteCurrencySymbol ?? current?.lastQuoteCurrencySymbol,
    lastQuotedAt: nextProject.lastQuotedAt ?? current?.lastQuotedAt,
    quoteCount: quoteRecords.length,
    projects: nextProjects
  };

  return [nextEntry, ...normalizedEntries.filter((entry) => entry.id !== id)].sort((left, right) =>
    right.lastWorkedAt.localeCompare(left.lastWorkedAt)
  );
}
