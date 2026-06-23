import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

function makeToken(payload: Record<string, unknown>) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_");
  return `header.${body}.sig`;
}

function setToken(role: string, expOffsetSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  localStorage.setItem("domusbrag_token", makeToken({ role, exp }));
}

function renderProtected(allowedRoles?: string[]) {
  render(
    <MemoryRouter initialEntries={["/panel"]}>
      <Routes>
        <Route
          path="/panel"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Panel privado</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Pantalla de login</div>} />
        <Route path="/buscar" element={<div>Buscar propiedades</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirige a /login si no hay sesión", () => {
    renderProtected(["OWNER"]);
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("renderiza el contenido protegido con token vigente y rol permitido", () => {
    setToken("OWNER", 3600);
    renderProtected(["OWNER"]);
    expect(screen.getByText("Panel privado")).toBeInTheDocument();
  });

  it("redirige a /login si el token está vencido", () => {
    setToken("OWNER", -100);
    renderProtected(["OWNER"]);
    expect(screen.getByText("Pantalla de login")).toBeInTheDocument();
  });

  it("redirige a /buscar si el rol no está permitido", () => {
    setToken("VISITOR", 3600);
    renderProtected(["OWNER"]);
    expect(screen.getByText("Buscar propiedades")).toBeInTheDocument();
  });
});
