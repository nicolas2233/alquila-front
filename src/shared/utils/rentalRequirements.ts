export type RentalRequirements = {
  guarantees?: string;
  entryMonths?: number;
  contractDurationMonths?: number;
  indexFrequency?: string;
  indexType?: string;
  indexValue?: number;
  isPublic?: boolean;
};

const frequencyLabels: Record<string, string> = {
  MONTHLY: "Mensual",
  QUARTERLY: "Trimestral",
  SEMI_ANNUAL: "Semestral",
  ANNUAL: "Anual",
};

const indexTypeLabels: Record<string, string> = {
  IPC: "IPC",
  UVA: "UVA",
  INFLATION: "Inflacion",
  OTHER: "Otro",
};

export const formatRentalRequirements = (requirements: RentalRequirements) => {
  const parts: string[] = [];
  if (requirements.guarantees) {
    parts.push(`Garantias: ${requirements.guarantees}`);
  }
  if (requirements.entryMonths !== undefined) {
    parts.push(`Meses para entrar: ${requirements.entryMonths}`);
  }
  if (requirements.contractDurationMonths !== undefined) {
    parts.push(`Duracion: ${requirements.contractDurationMonths} meses`);
  }
  if (requirements.indexFrequency) {
    parts.push(
      `Indexacion: ${frequencyLabels[requirements.indexFrequency] ?? requirements.indexFrequency}`
    );
  }
  if (requirements.indexType) {
    parts.push(`Indice: ${indexTypeLabels[requirements.indexType] ?? requirements.indexType}`);
  }
  if (requirements.indexValue !== undefined) {
    parts.push(`Valor indice: ${requirements.indexValue}`);
  }
  return parts.join(" · ");
};
