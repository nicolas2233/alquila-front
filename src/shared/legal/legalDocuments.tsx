import type { ReactNode } from "react";

export const LEGAL_TERMS_VERSION = "2026-04-28";
export const LEGAL_PRIVACY_VERSION = "2026-04-28";

export type LegalDocumentKey =
  | "terminos"
  | "privacidad"
  | "publicaciones"
  | "planes"
  | "arrepentimiento"
  | "baja-servicio";

type LegalSection = {
  title: string;
  body: ReactNode;
};

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  subtitle: string;
  summary: string;
  sections: LegalSection[];
};

const legalContact = "legal@domusbrag.com";
const supportContact = "soporte@domusbrag.com";
const cancellationContact = "baja@domusbrag.com";
const regretContact = "arrepentimiento@domusbrag.com";

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terminos: {
    key: "terminos",
    title: "Términos y condiciones",
    subtitle: "Condiciones generales de uso de DomusBrag.",
    summary:
      "Reglas de uso de la plataforma, alcance del servicio, responsabilidades de usuarios y condiciones generales.",
    sections: [
      {
        title: "1. Naturaleza del servicio",
        body: (
          <>
            <p>
              DomusBrag es una plataforma digital de publicaciones y contacto inmobiliario para
              Bragado y la zona. Su función es facilitar la publicación de avisos y el contacto
              entre buscadores, dueños directos e inmobiliarias.
            </p>
            <p>
              DomusBrag no actúa como corredor, martillero, inmobiliaria ni intermediario en las
              operaciones entre usuarios. No gestiona contratos, pagos, reservas ni cierre de
              operaciones entre las partes.
            </p>
          </>
        ),
      },
      {
        title: "2. Registro y cuentas",
        body: (
          <>
            <p>
              Cada usuario debe registrarse con datos reales, completos y actualizados. El titular
              de la cuenta es responsable por la confidencialidad de sus credenciales y por toda
              actividad realizada desde su cuenta.
            </p>
            <p>
              DomusBrag puede requerir información adicional o documentación para verificar
              identidad, titularidad o datos profesionales, y puede suspender cuentas ante falta
              de colaboración, inconsistencias, fraude o uso indebido.
            </p>
          </>
        ),
      },
      {
        title: "3. Publicaciones y contenido",
        body: (
          <>
            <p>
              Quien publica garantiza que cuenta con derechos, autorizaciones y datos suficientes
              para publicar el inmueble, la información y las imágenes cargadas.
            </p>
            <p>
              No se permite contenido falso, engañoso, duplicado de forma abusiva, ofensivo,
              ilegal o que infrinja derechos de terceros. DomusBrag puede editar, ocultar o
              eliminar publicaciones que incumplan estas reglas.
            </p>
          </>
        ),
      },
      {
        title: "4. Contactos y operaciones",
        body: (
          <>
            <p>
              Las conversaciones, negociaciones y acuerdos se realizan directamente entre las
              partes. DomusBrag no garantiza la veracidad total de cada publicación ni el
              cumplimiento de acuerdos entre usuarios.
            </p>
            <p>
              Recomendamos verificar identidad, documentación, titularidad, matrícula profesional
              y condiciones del inmueble antes de tomar decisiones comerciales.
            </p>
          </>
        ),
      },
      {
        title: "5. Planes pagos",
        body: (
          <p>
            Algunos perfiles pueden acceder a planes pagos. Las condiciones de facturación,
            renovación, cancelación, baja y arrepentimiento se regulan en la política de planes,
            facturación, cancelación y reembolsos publicada por DomusBrag.
          </p>
        ),
      },
      {
        title: "6. Moderación y reportes",
        body: (
          <p>
            DomusBrag puede suspender o dar de baja cuentas y publicaciones por sospecha de
            fraude, spam, infracción de derechos, incumplimientos repetidos o riesgo para otros
            usuarios. Los reportes pueden enviarse desde la plataforma o a {legalContact}.
          </p>
        ),
      },
      {
        title: "7. Ley aplicable",
        body: (
          <p>
            Estos términos se rigen por las leyes de la República Argentina. Los reclamos se
            interpretarán conforme a la normativa aplicable, incluyendo defensa del consumidor
            cuando corresponda.
          </p>
        ),
      },
    ],
  },
  privacidad: {
    key: "privacidad",
    title: "Política de privacidad",
    subtitle: "Tratamiento de datos personales en DomusBrag.",
    summary:
      "Qué datos recolectamos, para qué se usan, con quién se comparten y cómo ejercer derechos.",
    sections: [
      {
        title: "1. Datos que recolectamos",
        body: (
          <p>
            Podemos recolectar datos de registro, contacto, validación de identidad, publicaciones,
            solicitudes, preferencias de búsqueda, uso de la plataforma y datos técnicos necesarios
            para operar el servicio.
          </p>
        ),
      },
      {
        title: "2. Finalidades",
        body: (
          <p>
            Usamos los datos para crear cuentas, validar perfiles, permitir publicaciones, mostrar
            información inmobiliaria, facilitar contactos entre usuarios, prevenir fraude, moderar
            contenido, enviar notificaciones y mejorar la experiencia.
          </p>
        ),
      },
      {
        title: "3. Datos públicos y privados",
        body: (
          <p>
            Algunos datos se muestran públicamente cuando forman parte de una publicación o perfil
            visible. Otros datos se usan solo para validación, seguridad, soporte y administración
            interna.
          </p>
        ),
      },
      {
        title: "4. Proveedores",
        body: (
          <p>
            DomusBrag no vende datos personales. Puede compartir información con proveedores
            necesarios para operar la plataforma, como hosting, almacenamiento de imágenes, correo,
            analítica, mapas y medios de pago, bajo criterios razonables de seguridad.
          </p>
        ),
      },
      {
        title: "5. Seguridad y conservación",
        body: (
          <p>
            Aplicamos medidas razonables de seguridad y control de accesos. Conservamos datos
            durante el tiempo necesario para operar la cuenta, atender soporte, prevenir fraude,
            cumplir obligaciones legales y resguardar auditoría.
          </p>
        ),
      },
      {
        title: "6. Derechos del titular",
        body: (
          <p>
            Podés solicitar acceso, rectificación, actualización o supresión de tus datos escribiendo
            a {supportContact} o {legalContact}. La solicitud se atenderá conforme a los límites
            técnicos y legales aplicables.
          </p>
        ),
      },
      {
        title: "7. Cambios",
        body: (
          <p>
            Esta política puede actualizarse. La versión vigente estará disponible en la plataforma
            y, cuando corresponda, se notificarán cambios relevantes.
          </p>
        ),
      },
    ],
  },
  publicaciones: {
    key: "publicaciones",
    title: "Política de publicaciones, denuncias y copyright",
    subtitle: "Reglas de contenido y proceso de reportes en DomusBrag.",
    summary:
      "Contenido permitido, contenido prohibido, reportes de fraude y denuncias por derechos de autor o imagen.",
    sections: [
      {
        title: "1. Contenido permitido",
        body: (
          <p>
            Se permiten publicaciones de inmuebles con información real, fotos autorizadas, precio,
            ubicación aproximada o exacta cuando corresponda, descripción clara y canales de contacto
            válidos.
          </p>
        ),
      },
      {
        title: "2. Contenido prohibido",
        body: (
          <p>
            Se prohíben publicaciones fraudulentas, duplicadas de forma abusiva, con datos falsos,
            contenido ilegal, ofensivo, engañoso, spam, suplantación de identidad o infracción de
            derechos de autor, marca, imagen o privacidad.
          </p>
        ),
      },
      {
        title: "3. Imágenes, logos y marcas",
        body: (
          <p>
            Quien publica declara tener autorización suficiente para usar imágenes, planos, logos,
            marcas y cualquier otro contenido cargado. Ante una denuncia fundada, DomusBrag puede
            ocultar o remover contenido preventivamente mientras revisa el caso.
          </p>
        ),
      },
      {
        title: "4. Denuncias y reportes",
        body: (
          <p>
            Cualquier usuario o tercero puede denunciar una publicación o cuenta desde la plataforma
            o escribiendo a {legalContact}, indicando motivo y evidencia disponible.
          </p>
        ),
      },
      {
        title: "5. Sanciones",
        body: (
          <p>
            Las reincidencias, infracciones graves o conductas abusivas pueden derivar en ocultamiento
            de publicaciones, suspensión de cuentas o baja definitiva del servicio.
          </p>
        ),
      },
    ],
  },
  planes: {
    key: "planes",
    title: "Política de planes, facturación, cancelación y reembolsos",
    subtitle: "Condiciones comerciales de suscripciones en DomusBrag.",
    summary:
      "Reglas de planes, renovación, cobro, cancelación, baja, arrepentimiento y criterios de reembolso.",
    sections: [
      {
        title: "1. Planes y alcance",
        body: (
          <p>
            DomusBrag ofrece planes para determinados perfiles, como dueños directos e inmobiliarias.
            Cada plan informa precio, cupo de publicaciones y prestaciones disponibles antes de la
            contratación.
          </p>
        ),
      },
      {
        title: "2. Facturación y renovación",
        body: (
          <p>
            Los planes pagos pueden renovarse de forma mensual o anual según la opción seleccionada
            y el medio de pago utilizado. Los importes, moneda y condiciones se muestran antes de
            confirmar la contratación.
          </p>
        ),
      },
      {
        title: "3. Primer mes gratis",
        body: (
          <p>
            Cuando una promoción de primer mes gratis esté disponible, se activará al validar el
            medio de pago. El primer cobro se realizará al finalizar el período promocional, salvo
            cancelación o baja conforme a las condiciones informadas.
          </p>
        ),
      },
      {
        title: "4. Cancelación y baja",
        body: (
          <p>
            Podés solicitar la baja desde la plataforma o escribiendo a {cancellationContact}. La
            baja se procesará conforme a la normativa aplicable y a las condiciones del ciclo de
            facturación vigente.
          </p>
        ),
      },
      {
        title: "5. Arrepentimiento",
        body: (
          <p>
            Cuando corresponda por normativa de defensa del consumidor, podés ejercer el derecho de
            arrepentimiento escribiendo a {regretContact} dentro de los plazos legales aplicables.
          </p>
        ),
      },
      {
        title: "6. Reembolsos",
        body: (
          <p>
            Las devoluciones o reembolsos se analizarán según el motivo, el estado del servicio, el
            medio de pago, la normativa aplicable y las condiciones comunicadas al contratar.
          </p>
        ),
      },
    ],
  },
  arrepentimiento: {
    key: "arrepentimiento",
    title: "Botón de arrepentimiento",
    subtitle: "Solicitud de arrepentimiento de contratación a distancia.",
    summary:
      "Canal para ejercer el derecho de arrepentimiento conforme normativa de defensa del consumidor.",
    sections: [
      {
        title: "Cómo solicitarlo",
        body: (
          <p>
            Si contrataste un plan en DomusBrag a distancia y querés ejercer tu derecho de
            arrepentimiento, escribinos a {regretContact} indicando nombre y apellido, email de la
            cuenta, fecha aproximada de contratación, plan contratado y canal de contacto.
          </p>
        ),
      },
      {
        title: "Respuesta",
        body: (
          <p>
            Revisaremos la solicitud y responderemos por email conforme a la normativa aplicable y
            las condiciones comunicadas al momento de contratar.
          </p>
        ),
      },
    ],
  },
  "baja-servicio": {
    key: "baja-servicio",
    title: "Baja de servicio",
    subtitle: "Canal para solicitar la baja de suscripción.",
    summary: "Solicitud de baja de plan o servicio activo en DomusBrag.",
    sections: [
      {
        title: "Cómo solicitar la baja",
        body: (
          <p>
            Para solicitar la baja de tu suscripción, escribinos a {cancellationContact} con el
            email de la cuenta, plan activo y una forma de contacto. Si tenés pagos pendientes o
            verificaciones en curso, te informaremos el estado.
          </p>
        ),
      },
      {
        title: "Procesamiento",
        body: (
          <p>
            La baja se procesará conforme a la normativa aplicable y a las condiciones del servicio
            informadas al contratar.
          </p>
        ),
      },
    ],
  },
};

export const legalDocumentList = ([
  "terminos",
  "privacidad",
  "publicaciones",
  "planes",
  "arrepentimiento",
  "baja-servicio",
] as const).map((key) => legalDocuments[key]);

export function LegalDocumentContent({ document }: { document: LegalDocument }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-night-900/36 p-4 text-sm text-[#D1C7BD]">
        {document.summary}
      </div>
      {document.sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h4 className="text-base text-white">{section.title}</h4>
          <div className="space-y-2 text-sm text-[#E7E2DD]">{section.body}</div>
        </div>
      ))}
    </div>
  );
}
