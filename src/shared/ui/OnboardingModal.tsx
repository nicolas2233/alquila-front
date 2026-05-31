import { useState } from "react";
import { Link } from "react-router-dom";

type OnboardingStep = {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; to: string };
};

const ONBOARDING_KEY = "domusbrag_onboarding_done";

export function hasCompletedOnboarding() {
  return Boolean(localStorage.getItem(ONBOARDING_KEY));
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "1");
}

const steps: OnboardingStep[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-gold-300">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    title: "Bienvenido a DomusBrag",
    description: "La plataforma inmobiliaria de Bragado. En minutos podrás publicar tu propiedad y conectar con interesados.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-gold-300">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    title: "Completá tu perfil",
    description: "Agregá tu foto, teléfono y datos de contacto para generar confianza con los interesados. Un perfil completo recibe más consultas.",
    cta: { label: "Ir a mi perfil", to: "/panel?tab=profile" },
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-gold-300">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    ),
    title: "Publicá tu primer inmueble",
    description: "El proceso toma 5 minutos. Completá la información básica, ubicación, características y fotos. ¡Tu primer publicación es gratis!",
    cta: { label: "Crear publicación", to: "/publicar" },
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-gold-300">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
    title: "Respondé consultas rápido",
    description: "Recibirás notificaciones cuando alguien se interese en tu propiedad. Respondé rápido para aumentar tus chances de concretar.",
    cta: { label: "Ver panel", to: "/panel" },
  },
];

type Props = {
  onClose: () => void;
};

export function OnboardingModal({ onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-night-900 shadow-card">
        {/* Progress */}
        <div className="flex gap-1 p-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${index <= currentStep ? "bg-gold-300" : "bg-white/15"}`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 px-6 pb-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10">
            {step.icon}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#D1C7BD]">{step.description}</p>
          </div>

          <div className="flex w-full flex-col gap-2 pt-2">
            {step.cta ? (
              <Link
                to={step.cta.to}
                onClick={handleNext}
                className="w-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] py-2.5 text-sm font-semibold text-night-900 text-center"
              >
                {step.cta.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="w-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] py-2.5 text-sm font-semibold text-night-900"
              >
                {isLast ? "Empezar" : "Siguiente"}
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-[#D1C7BD] hover:text-white"
              >
                Saltar introducción
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-3 text-center text-[11px] text-[#D1C7BD]">
          Paso {currentStep + 1} de {steps.length}
        </div>
      </div>
    </div>
  );
}
