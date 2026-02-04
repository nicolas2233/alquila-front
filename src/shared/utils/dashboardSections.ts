export type PanelSection = "profile" | "listings" | "requests" | "my-requests";

export const getSectionTitle = (section: PanelSection, isAgency: boolean) => {
  if (section === "profile") {
    return isAgency ? "Perfil inmobiliaria" : "Perfil due?o";
  }
  if (section === "listings") {
    return "Mis inmuebles";
  }
  if (section === "requests") {
    return "Solicitudes";
  }
  return "Mis solicitudes";
};

export const getSectionSubtitle = (section: PanelSection) => {
  if (section === "profile") {
    return "Actualiza tus datos y la informaci?n visible.";
  }
  if (section === "listings") {
    return "Controla estados, disponibilidad y contactos.";
  }
  return "Gestiona las solicitudes recibidas.";
};
