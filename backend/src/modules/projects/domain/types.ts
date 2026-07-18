export interface Project {
  code: string;
  name: string;
  description: string;
  currencies: ProjectCurrency[];
  createdAt: string;
  updatedAt: string;
  legacyConfigId?: string | null;
}

export type ProjectCurrencyValueType = "integer" | "decimal";

export interface ProjectCurrency {
  id: string;
  code: string;
  name: string;
  label: string;
  shortLabel?: string;
  valueType: ProjectCurrencyValueType;
  precision: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectReadModel extends Project {
  id: string;
}
