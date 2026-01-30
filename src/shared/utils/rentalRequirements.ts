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
  INFLATION: "Inflación",
  OTHER: "Otro",
};

export const formatRentalRequirements = (requirements: RentalRequirements) => {
  const parts: string[] = [];
  if (requirements.guarantees) {
    parts.push(`Garantías: ${requirements.guarantees}`);
  }
  if (requirements.entryMonths !== undefined) {
    parts.push(`Meses para entrar: ${requirements.entryMonths}`);
  }
  if (requirements.contractDurationMonths !== undefined) {
    parts.push(`Duración: ${requirements.contractDurationMonths} meses`);
  }
  if (requirements.indexFrequency) {
    parts.push(
      `Indexación: ${frequencyLabels[requirements.indexFrequency] ?? requirements.indexFrequency}`
    );
  }
  if (requirements.indexType) {
    parts.push(`Índice: ${indexTypeLabels[requirements.indexType] ?? requirements.indexType}`);
  }
  if (requirements.indexValue !== undefined) {
    parts.push(`Valor Índice: ${requirements.indexValue}`);
  }
  return parts.join(" · ");
};
