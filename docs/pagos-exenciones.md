# Exenciones y ajustes de cuotas: estado y pendientes

Nota de diseño para retomar en la próxima sesión. Escrita el 2026-10-21.

## 1. Qué está hecho (commit `f4a7fe8`)

Un jugador puede estar **exento de pagos en una temporada**, con un motivo opcional (coordinación, cuerpo técnico, un favor puntual…).

- **Datos:** tabla `public.payment_exemptions` (`player_id`, `season` `YYYY-YY`, `reason`, `created_by`, `created_at`; única por jugador y temporada). RLS activado y sin permisos para `anon` ni `authenticated`: solo se lee y escribe con service role.
- **Reglas:** un exento no recibe cuotas previstas, queda fuera de la asignación masiva «Todos», no admite un pago suelto (409), y sus pagos pendientes ya registrados no cuentan como deuda (se conservan).
- **API:** `PUT` y `DELETE` en `/api/payments/exemptions`, solo admin.
- **UI admin:** `ExemptionPanel` en el detalle del jugador, etiqueta «Exento» en el resumen y fuera del modal de nuevo pago. **UI jugador:** tarjeta del inicio y pantalla de pagos.
- **Si la tabla no existe todavía** la app la trata como «sin exentos» y avisa en el log. Marcar a alguien como exento falla con «Falta aplicar la migración».

Código: `src/lib/payments/exemptions.ts`, `src/lib/payments/getPaymentsSnapshot.ts`, `src/app/api/payments/route.ts`, `src/app/api/payments/exemptions/route.ts`, `src/components/payments/ExemptionPanel.tsx`.

## 2. Migraciones en Supabase

**Aplicadas** (comprobado el 2026-10-26: la tabla `payment_exemptions` y las columnas de contacto de `fed_clubs` existen en la base de datos):

- `supabase/migrations/20261021120000_payment_exemptions.sql`  ← exenciones
- `supabase/migrations/20261019120000_fed_clubs_contact.sql`  ← contacto de clubes rivales

Si la segunda se aplicó después de la última sincronización con la federación, lanzar una para rellenar teléfonos y correos.

## 3. Decisiones tomadas (confirmadas por el usuario)

- **Por temporada**, no permanente: la coordinación cambia de un año a otro.
- **Con motivo libre**: sirve también para favores puntuales a un jugador, no solo cargos.
- **Tabla propia**, sin tocar `players` (se comparte con el Portal).
- **Solo jugadores**: los pagos cuelgan de `player_id`; un usuario sin ficha no recibe cuotas.
- Los pendientes ya registrados de un exento **no cuentan como deuda**. Se pueden quitar a mano: casilla al marcar la exención, o botón «Quitar pendientes» en su detalle (borra solo los pendientes de esa temporada, nunca los cobrados). Si quedan restos, el «Por hacer» del inicio avisa («N exentos con pagos pendientes»). Se descartó un cron que los borre solo: es irreversible y una exención marcada por error borraría cuotas reales.

## 4. Portal (implementado el 2026-10-26, commit `5924aa7` en `CVOrotava-Portal`)

Team Manager y el Portal **comparten la misma base de datos de Supabase**, así que la exención afecta a los dos. **Contrato común:** «exento = existe una fila `(player_id, season)` en `payment_exemptions`».

En el Portal:

- **Lectura:** con service role (la tabla sigue cerrada a `authenticated`, el motivo no es legible por las familias). Caché corta con el tag de pagos para que lo marcado desde Team Manager llegue pronto.
- **Reglas:** un exento no tiene obligaciones, deuda ni avisos por correo, no sale en la lista de morosos de WhatsApp ni en la matriz de pagos, y cuenta como matrícula resuelta. Sus cobros ya anotados siguen sumando en el inicio.
- **Cobros:** registrar un cobro (suelto o en bloque) a un exento se rechaza hasta quitarle la exención.
- **Dónde se edita:** Team Manager, en el detalle del jugador de pagos (`ExemptionPanel`); Portal, en la ficha del jugador (sección «Exención de pagos», solo admin; el manager la ve). Las dos escriben en la misma tabla.
- **Decisión:** no se creó la función SQL `is_payment_exempt`; el contrato de arriba basta mientras cada repo lea la tabla con service role.

## 5. Ideas futuras (no implementadas, solo apuntadas)

El usuario planteó casos más finos que la exención total de la temporada:

- **Pagar menos un mes por ausencia** (sobre todo quien tiene la cuota extendida de 30 €, `players.pays_extended_monthly`; puede que casi no ocurra).
- **No pagar varios meses** por un viaje forzoso u otra causa.

Propuesta de partida (a discutir):

- Nueva tabla `payment_adjustments`: `player_id`, `season`, `fee_code`, `billing_month` (o varios), `kind` (`waive` = perdonar, `override_amount` = importe distinto), `amount`, `reason`, `created_by`, `created_at`. La exención total sería equivalente a perdonar todo.
- Las mensualidades de base **no se prevén**, son filas reales: perdonar un mes podría ser editar o borrar esa fila, pero un ajuste explícito deja rastro y motivo y evita que se recree.
- Efectos a cubrir: cuotas previstas (`missingFees`), mensualidades reales, importes en el resumen y en «Por hacer», recordatorios, y la UI por cuota («Perdonar» y «Ajustar importe» con motivo).
- Mismo requisito que las exenciones: reflejarlo también en el Portal.

Preguntas abiertas: ¿ajuste por mes o por rango de meses?, ¿quién puede aprobarlo?, ¿se informa a la familia?, ¿el perdón es definitivo o puede revertirse?

## 6. Para la próxima sesión

1. Probar el flujo de exenciones en pantalla en los dos repos (marcar, ver que desaparece de deuda y matriz, intentar cobrar, quitar).
2. Si se aborda, diseñar los ajustes por mes (sección 5) antes de tocar código.
