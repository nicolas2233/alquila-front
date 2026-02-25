import type { ReactNode } from "react";

export const LEGAL_TERMS_VERSION = "2026-02-23";
export const LEGAL_PRIVACY_VERSION = "2026-02-23";

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

const legalNotice = (
  <p>
    Este documento es un borrador operativo para DomusBrag y debe ser revisado por un/a
    abogado/a matriculado/a en Argentina antes del lanzamiento comercial.
  </p>
);

export const legalDocuments: Record<LegalDocumentKey, LegalDocument> = {
  terminos: {
    key: "terminos",
    title: "T?rminos y condiciones",
    subtitle: "Condiciones generales de uso de DomusBrag.",
    summary:
      "Reglas de uso de la plataforma, alcances del servicio, responsabilidades y limitaciones.",
    sections: [
      {
        title: "1. Naturaleza del servicio",
        body: (
          <>
            <p>
              DomusBrag es una plataforma digital de publicaciones y contacto inmobiliario. Su
              funci?n es facilitar la publicaci?n de avisos y el contacto entre usuarios,
              dueños directos e inmobiliarias.
            </p>
            <p>
              DomusBrag no act?a como corredor, martillero, inmobiliaria ni intermediario en las
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
              Cada usuario debe registrarse con datos reales, completos y actualizados. El
              titular de la cuenta es responsable por la confidencialidad de sus credenciales y
              por toda actividad realizada desde su cuenta.
            </p>
            <p>
              DomusBrag puede requerir informaci?n adicional o documentaci?n para verificar
              identidad, titularidad o datos profesionales, y podr? suspender cuentas ante falta
              de colaboraci?n o inconsistencias.
            </p>
          </>
        ),
      },
      {
        title: "3. Publicaciones y contenido",
        body: (
          <>
            <p>
              El usuario que p?blica garantiza que cuenta con derechos, autorizaciones y datos
              suficientes para publicar el inmueble, la informaci?n y las im?genes cargadas.
            </p>
            <p>
              No se permite contenido falso, engañoso, duplicado, ofensivo, ilegal o que infrinja
              derechos de terceros. DomusBrag podr? editar, ocultar o eliminar publicaciones que
              incumplan estas reglas.
            </p>
          </>
        ),
      },
      {
        title: "4. Licencia sobre contenidos",
        body: (
          <>
            <p>
              Al publicar contenido, el usuario otorga a DomusBrag una licencia no exclusiva,
              revocable y limitada para alojar, reproducir, adaptar (por ejemplo, redimensionar)
              y mostrar dicho contenido dentro de la plataforma, sus listados y vistas previas.
            </p>
            <p>
              Esta licencia se limita a la prestaci?n del servicio y finaliza, en terminos
              razonables, cuando el contenido es removido de la plataforma, salvo copias de
              seguridad o exigencias legales.
            </p>
          </>
        ),
      },
      {
        title: "5. Contactos y operaciones entre usuarios",
        body: (
          <>
            <p>
              Las conversaciones, negociaciones y acuerdos se realizan directamente entre las
              partes. DomusBrag no garantiza la veracidad total de cada publicaci?n ni el
              cumplimiento de acuerdos entre usuarios.
            </p>
            <p>
              Se recomienda verificar identidad, documentaci?n, titularidad, matr?cula
              profesional y condiciones del inmueble antes de cualquier decisi?n.
            </p>
          </>
        ),
      },
      {
        title: "6. Moderacion, denuncias y suspensiones",
        body: (
          <>
            <p>
              DomusBrag podr? suspender o dar de baja cuentas y publicaciones por sospecha de
              fraude, spam, infracci?n de derechos, incumplimientos repetidos o riesgo para
              usuarios.
            </p>
            <p>
              Cualquier persona afectada por una publicaci?n o contenido podr? denunciarlo a
              trav?s de los canales informados en la plataforma.
            </p>
          </>
        ),
      },
      {
        title: "7. Planes pagos, cambios y cancelación",
        body: (
          <>
            <p>
              Algunos perfiles pueden acceder a planes pagos mensuales. Las condiciones de
              facturación, renovación, cancelación, baja y arrepentimiento se regulan en la
              política de planes y cancelación publicada por DomusBrag.
            </p>
            <p>
              DomusBrag podr? modificar precios o prestaciones con aviso previo razonable, sin
              afectar derechos ya devengados seg?n normativa aplicable.
            </p>
          </>
        ),
      },
      {
        title: "8. Limitaci?n de responsabilidad",
        body: (
          <>
            <p>
              En la medida permitida por la normativa aplicable, DomusBrag no ser? responsable
              por daños indirectos, lucro cesante, p?rdida de oportunidades o perjuicios
              derivados de contenido de terceros, fallas de terceros o acuerdos celebrados entre
              usuarios.
            </p>
            <p>
              Nada de lo aqu? dispuesto limita responsabilidades que no puedan excluirse por ley.
            </p>
          </>
        ),
      },
      {
        title: "9. Ley aplicable y jurisdicci?n",
        body: (
          <p>
            Estos t?rminos se rigen por las leyes de la Rep?blica Argentina. La jurisdicci?n
            aplicable y mecanismos de reclamo se interpretar?n de conformidad con normativa de
            defensa del consumidor y dem?s disposiciones vigentes.
          </p>
        ),
      },
      {
        title: "10. Revisi?n profesional",
        body: legalNotice,
      },
    ],
  },
  privacidad: {
    key: "privacidad",
    title: "Pol?tica de privacidad",
    subtitle: "Tratamiento de datos personales en DomusBrag.",
    summary:
      "Qu? datos se recolectan, para qu? se usan, con qui?n se comparten y c?mo ejercer derechos.",
    sections: [
      {
        title: "1. Datos que recolectamos",
        body: (
          <>
            <p>
              DomusBrag puede recolectar datos de registro (nombre, email, teléfono, DNI u otros
              datos de validaci?n seg?n perfil), datos de publicaciones, datos de contacto y
              datos t?cnicos de uso necesarios para operar la plataforma.
            </p>
            <p>
              Algunos datos se usan de forma p?blica (por ejemplo, informaci?n de una
              publicaci?n) y otros solo para validaci?n, seguridad y soporte interno.
            </p>
          </>
        ),
      },
      {
        title: "2. Finalidades",
        body: (
          <>
            <p>
              Usamos los datos para crear cuentas, validar perfiles, permitir publicaciones,
              facilitar contactos entre usuarios, prevenir fraude, moderar contenido, enviar
              notificaciones del servicio y mejorar la experiencia.
            </p>
            <p>
              Tambi?n podemos usar datos de forma agregada o anonimizada para anal?tica y mejora
              del producto.
            </p>
          </>
        ),
      },
      {
        title: "3. Base de tratamiento y consentimiento",
        body: (
          <p>
            El tratamiento se realiza en la medida necesaria para prestar el servicio, cumplir
            obligaciones legales y, cuando corresponda, en base al consentimiento del usuario.
          </p>
        ),
      },
      {
        title: "4. Compartici?n de datos",
        body: (
          <>
            <p>
              DomusBrag no vende datos personales. Puede compartir informaci?n con proveedores
              necesarios para operar la plataforma (por ejemplo, hosting, almacenamiento de
              im?genes, correo o anal?tica), bajo criterios razonables de seguridad.
            </p>
            <p>
              Tambi?n podr? divulgar informaci?n cuando exista requerimiento legal v?lido o sea
              necesario para investigar fraudes, abusos o infracciones.
            </p>
          </>
        ),
      },
      {
        title: "5. Conservaci?n de datos",
        body: (
          <p>
            Conservamos datos durante el tiempo necesario para operar la cuenta, cumplir fines de
            seguridad, soporte, auditoria o exigencias legales. Al solicitar baja, algunos datos
            podr?n mantenerse por plazos legales o de resguardo.
          </p>
        ),
      },
      {
        title: "6. Seguridad",
        body: (
          <p>
            Aplicamos medidas razonables de seguridad, control de accesos y separaci?n de datos
            públicos/privados. Ningún sistema es infalible, pero trabajamos para reducir riesgos
            y responder incidentes de forma diligente.
          </p>
        ),
      },
      {
        title: "7. Derechos del titular",
        body: (
          <p>
            El usuario puede solicitar acceso, rectificaci?n, actualizaci?n o supresi?n de sus
            datos, dentro de los l?mites legales y t?cnicos aplicables, mediante los canales de
            contacto de DomusBrag.
          </p>
        ),
      },
      {
        title: "8. Cambios",
        body: (
          <p>
            Esta pol?tica puede actualizarse. La versi?n vigente estar? disponible en la
            plataforma y, cuando corresponda, se notificar?n cambios relevantes.
          </p>
        ),
      },
      {
        title: "9. Revisi?n profesional",
        body: legalNotice,
      },
    ],
  },
  publicaciones: {
    key: "publicaciones",
    title: "Politica de publicaciones, denuncias y copyright",
    subtitle: "Reglas de contenido y proceso de reportes en DomusBrag.",
    summary:
      "Contenido permitido/prohibido, denuncias de fraude y procedimiento de baja por derechos de autor o imagen.",
    sections: [
      {
        title: "1. Contenido permitido",
        body: (
          <p>
            Publicaciones de inmuebles con datos claros, fotos autorizadas, informaci?n real y
            canales de contacto v?lidos. El contenido debe respetar las leyes vigentes y derechos
            de terceros.
          </p>
        ),
      },
      {
        title: "2. Contenido prohibido",
        body: (
          <>
            <p>
              Se proh?ben publicaciones fraudulentas, duplicadas de forma abusiva, con datos
              falsos, contenido ilegal, ofensivo, engañoso, spam o que infrinja derechos de autor,
              marca, imagen o privacidad.
            </p>
            <p>
              Tambi?n se proh?ben intentos de suplantaci?n de identidad, matr?cula o titularidad
              del inmueble.
            </p>
          </>
        ),
      },
      {
        title: "3. Uso de im?genes y logos",
        body: (
          <>
            <p>
              Quien publica declara tener autorizaci?n suficiente para usar im?genes, planos,
              logos, marcas y cualquier otro contenido cargado en DomusBrag.
            </p>
            <p>
              Si recibimos una denuncia fundada por infracci?n de derechos, podremos ocultar o
              remover contenido de forma preventiva mientras se revisa el caso.
            </p>
          </>
        ),
      },
      {
        title: "4. Denuncias y reportes",
        body: (
          <>
            <p>
              Cualquier usuario o tercero puede denunciar una publicaci?n o una cuenta indicando
              el motivo y, si es posible, evidencia (por ejemplo, titularidad, matr?cula,
              documentaci?n o prueba de autor?a).
            </p>
            <p>
              DomusBrag evaluar? la denuncia y podr?: solicitar informaci?n, ocultar la
              publicaci?n, desestimarla o suspender cuentas en caso de incumplimientos.
            </p>
          </>
        ),
      },
      {
        title: "5. Reincidencia y sanciones",
        body: (
          <p>
            Reincidencias en publicaciones fraudulentas, infracciones de derechos o conductas
            abusivas pueden derivar en suspensiones temporales o definitivas, sin perjuicio de
            otras medidas legales aplicables.
          </p>
        ),
      },
      {
        title: "6. Canales sugeridos de contacto legal",
        body: (
          <p>
            Se recomienda publicar en la plataforma un canal espec?fico para denuncias y temas
            legales/copyright (por ejemplo: legal@domusbrag.com) junto con un formulario de
            reporte.
          </p>
        ),
      },
      {
        title: "7. Revisi?n profesional",
        body: legalNotice,
      },
    ],
  },
  planes: {
    key: "planes",
    title: "Política de planes, facturación, cancelación y reembolsos",
    subtitle: "Condiciones comerciales de suscripciones en DomusBrag.",
    summary:
      "Reglas de planes mensuales, renovación, cobro, cancelación y criterios de reembolso.",
    sections: [
      {
        title: "1. Planes y alcance",
        body: (
          <p>
            DomusBrag ofrece planes mensuales para determinados perfiles (por ejemplo, dueños
            directos e inmobiliarias), con l?mites y prestaciones definidos en la plataforma.
          </p>
        ),
      },
      {
        title: "2. Facturación y renovación",
        body: (
          <>
            <p>
              Los planes pueden renovarse de forma peri?dica seg?n el medio de pago utilizado y
              las condiciones informadas al momento de la contrataci?n.
            </p>
            <p>
              Los importes, impuestos y moneda aplicable se muestran antes de confirmar la
              contrataci?n. DomusBrag podr? actualizar precios con aviso previo razonable.
            </p>
          </>
        ),
      },
      {
        title: "3. Cancelacion y baja de servicio",
        body: (
          <p>
            El usuario puede solicitar la baja del servicio mediante el canal habilitado en la
            plataforma. La baja aplicar? seg?n la normativa vigente y las condiciones del ciclo de
            facturación correspondiente.
          </p>
        ),
      },
      {
        title: "4. Derecho de arrepentimiento",
        body: (
          <p>
            Cuando corresponda por normativa de defensa del consumidor, el usuario podr? ejercer
            el derecho de arrepentimiento a trav?s del bot?n/canal publicado por DomusBrag dentro
            de los plazos legales aplicables.
          </p>
        ),
      },
      {
        title: "5. Reembolsos",
        body: (
          <p>
            Las devoluciones o reembolsos se analizar?n seg?n el motivo, el estado del servicio,
            el medio de pago, la normativa aplicable y las condiciones comunicadas al contratar.
          </p>
        ),
      },
      {
        title: "6. Revisi?n profesional",
        body: legalNotice,
      },
    ],
  },
  arrepentimiento: {
    key: "arrepentimiento",
    title: "Bot?n de arrepentimiento",
    subtitle: "Solicitud de arrepentimiento de contrataci?n a distancia.",
    summary:
      "Canal para ejercer el derecho de arrepentimiento conforme normativa de defensa del consumidor.",
    sections: [
      {
        title: "C?mo solicitarlo",
        body: (
          <>
            <p>
              Si contrataste un plan en DomusBrag a distancia y quer?s ejercer tu derecho de
              arrepentimiento, env?anos la solicitud indicando:
            </p>
            <p>
              Nombre y apellido, email de la cuenta, fecha aproximada de contrataci?n, plan
              contratado y un canal de contacto. Conserva el comprobante de env?o.
            </p>
          </>
        ),
      },
      {
        title: "Canal sugerido",
        body: <p>Email: arrepentimiento@domusbrag.com (placeholder a confirmar)</p>,
      },
      {
        title: "Aviso",
        body: legalNotice,
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
        title: "C?mo solicitar la baja",
        body: (
          <>
            <p>
              Para solicitar la baja de tu suscripción, envíanos tu pedido con el email de la
              cuenta, el plan activo y una forma de contacto. Si ten?s pagos pendientes o
              verificaciones en curso, te informaremos el estado.
            </p>
            <p>
              La baja se procesar? conforme la normativa aplicable y condiciones del servicio
              informadas al contratar.
            </p>
          </>
        ),
      },
      {
        title: "Canal sugerido",
        body: <p>Email: baja@domusbrag.com (placeholder a confirmar)</p>,
      },
      {
        title: "Aviso",
        body: legalNotice,
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
