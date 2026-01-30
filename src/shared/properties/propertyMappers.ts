import type { PropertyDetailListing } from "./PropertyDetailModal";

export type PropertyApiListItem = {
  id: string;
  title: string;
  description: string;
  operationType: "SALE" | "RENT" | "TEMPORARY";
  propertyType:
    | "HOUSE"
    | "APARTMENT"
    | "LAND"
    | "FIELD"
    | "QUINTA"
    | "COMMERCIAL"
    | "OFFICE"
    | "WAREHOUSE";
  status?: string;
  priceAmount: string | number;
  priceCurrency: "ARS" | "USD";
  expensesAmount?: string | number | null;
  expensesCurrency?: "ARS" | "USD" | null;
  rooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  features?: {
    hasGarage?: boolean;
    petsAllowed?: boolean;
    kidsAllowed?: boolean;
    bedrooms?: number;
    amenities?: string[];
    financingAvailable?: boolean;
    financingAmount?: number | null;
    financingCurrency?: "ARS" | "USD";
    rentalRequirements?: {
      guarantees?: string;
      entryMonths?: number;
      contractDurationMonths?: number;
      indexFrequency?: string;
      indexType?: string;
      indexValue?: number;
      isPublic?: boolean;
    } | null;
    showMapLocation?: boolean;
  } | null;
  services?: {
    electricity?: boolean;
    gas?: boolean;
    water?: boolean;
    sewer?: boolean;
    internet?: boolean;
    pavement?: boolean;
  } | null;
  location: {
    addressLine: string;
    localityId: string;
    lat?: number | null;
    lng?: number | null;
    locality?: { name: string } | null;
  };
  unitLabel?: string | null;
  photos?: { id?: string; url: string }[];
  agency?: { name: string } | null;
  updatedAt?: string;
};

export type PropertyApiDetail = PropertyApiListItem & {
  location: {
    addressLine: string;
    localityId: string;
    lat?: number | null;
    lng?: number | null;
    locality?: { name: string } | null;
  };
  unitLabel?: string | null;
  photos?: { id: string; url: string }[];
  agency?: { name: string } | null;
  contactMethods?: { id: string; type: "WHATSAPP" | "PHONE" | "IN_APP"; value: string }[];
  ownerUserId?: string | null;
  agencyId?: string | null;
};

export type SearchListing = PropertyDetailListing & {
  propertyType: string;
  description: string;
  image: string;
  agency?: string | null;
  financingLabel?: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80";

export const operationLabel = (value: string) => {
  switch (value) {
    case "SALE":
      return "Venta";
    case "RENT":
      return "Alquiler";
    case "TEMPORARY":
      return "Temporario";
    default:
      return value;
  }
};

export const propertyTypeLabel = (value: string) => {
  switch (value) {
    case "HOUSE":
      return "Casa";
    case "APARTMENT":
      return "Departamento";
    case "LAND":
      return "Terreno";
    case "FIELD":
      return "Campo";
    case "QUINTA":
      return "Quinta";
    case "COMMERCIAL":
      return "Comercio";
    case "OFFICE":
      return "Oficina";
    case "WAREHOUSE":
      return "Galpon";
    default:
      return value;
  }
};

export const formatPrice = (amount: string | number, currency: string) => {
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    return `${currency} ${amount}`;
  }
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount}`;
  }
};

export const mapPropertyToSearchListing = (item: PropertyApiListItem): SearchListing => {
  const localityName = item.location.locality?.name ?? item.location.localityId;
  const unitSuffix = item.unitLabel ? ` (${item.unitLabel})` : "";
  const address = `${item.location.addressLine}${unitSuffix}${
    localityName ? ` - ${localityName}` : ""
  }`;
  const images = item.photos?.map((photo) => photo.url) ?? [];
  const image = images[0] ?? fallbackImage;

  return {
    id: item.id,
    title: item.title,
    address,
    price: formatPrice(item.priceAmount, item.priceCurrency),
    rooms: item.rooms ?? 0,
    areaM2: item.areaM2 ?? 0,
    bathrooms: item.bathrooms ?? undefined,
    bedrooms: item.features?.bedrooms ?? undefined,
    garage: item.features?.hasGarage ?? false,
    pets: item.features?.petsAllowed ?? false,
    kids: item.features?.kidsAllowed ?? false,
    operation: operationLabel(item.operationType),
    propertyType: propertyTypeLabel(item.propertyType),
    agency: item.agency?.name ?? null,
    images: images.length ? images : [image],
    description: item.description,
    descriptionLong: item.description,
    image,
    expensesAmount:
      item.expensesAmount !== undefined && item.expensesAmount !== null
        ? formatPrice(item.expensesAmount, item.expensesCurrency ?? item.priceCurrency)
        : undefined,
    financingLabel:
      item.features?.financingAvailable && item.features.financingAmount
        ? formatPrice(item.features.financingAmount, item.features.financingCurrency ?? item.priceCurrency)
        : item.features?.financingAvailable
        ? "Si"
        : undefined,
    amenities: item.features?.amenities ?? undefined,
    services: item.services ?? undefined,
    showMapLocation: item.features?.showMapLocation ?? true,
  };
};

export const mapPropertyToDetailListing = (
  item: PropertyApiDetail
): PropertyDetailListing => {
  const localityName = item.location.locality?.name ?? item.location.localityId;
  const unitSuffix = item.unitLabel ? ` (${item.unitLabel})` : "";
  const address = `${item.location.addressLine}${unitSuffix}${
    localityName ? ` - ${localityName}` : ""
  }`;
  const images = item.photos?.map((photo) => photo.url) ?? [];

  return {
    id: item.id,
    title: item.title,
    address,
    price: formatPrice(item.priceAmount, item.priceCurrency),
    operation: operationLabel(item.operationType),
    areaM2: item.areaM2 ?? 0,
    rooms: item.rooms ?? 0,
    bathrooms: item.bathrooms ?? undefined,
    bedrooms: item.features?.bedrooms ?? undefined,
    garage: item.features?.hasGarage ?? false,
    pets: item.features?.petsAllowed ?? false,
    kids: item.features?.kidsAllowed ?? false,
    descriptionLong: item.description,
    images: images.length ? images : [fallbackImage],
    agency: item.agency?.name ?? null,
    ownerUserId: item.ownerUserId ?? null,
    agencyId: item.agencyId ?? null,
    propertyType: propertyTypeLabel(item.propertyType),
    amenities: item.features?.amenities ?? undefined,
    services: item.services ?? undefined,
    expensesAmount:
      item.expensesAmount !== undefined && item.expensesAmount !== null
        ? formatPrice(item.expensesAmount, item.expensesCurrency ?? item.priceCurrency)
        : undefined,
    financing: {
      available: Boolean(item.features?.financingAvailable),
      amount:
        item.features?.financingAmount !== undefined && item.features?.financingAmount !== null
          ? formatPrice(item.features.financingAmount, item.features.financingCurrency ?? item.priceCurrency)
          : undefined,
    },
    lat: item.location?.lat ?? undefined,
    lng: item.location?.lng ?? undefined,
    showMapLocation: item.features?.showMapLocation ?? true,
    rentalRequirements:
      item.features?.rentalRequirements && item.features.rentalRequirements.isPublic
        ? {
            guarantees: item.features.rentalRequirements.guarantees,
            entryMonths: item.features.rentalRequirements.entryMonths ?? undefined,
            contractDurationMonths:
              item.features.rentalRequirements.contractDurationMonths ?? undefined,
            indexFrequency: item.features.rentalRequirements.indexFrequency,
            indexType: item.features.rentalRequirements.indexType,
            indexValue: item.features.rentalRequirements.indexValue ?? undefined,
            isPublic: item.features.rentalRequirements.isPublic,
          }
        : undefined,
    contactMethods: item.contactMethods?.map((method) => ({
      type: method.type,
      value: method.value,
    })),
  };
};
