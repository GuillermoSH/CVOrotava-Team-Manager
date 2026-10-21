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

## 2. SQL pendiente de aplicar en Supabase

**No aplicado a fecha 2026-10-21.** Hay que ejecutarlo a mano (no hay acceso a la base de datos desde las sesiones de Claude):

- `supabase/migrations/20261021120000_payment_exemptions.sql`  ← exenciones
- `supabase/migrations/20261019120000_fed_clubs_contact.sql`  ← contacto de clubes rivales (confirmar si ya se aplicó; sin ella `/contacts` da error)

Después de aplicar la segunda, lanzar una sincronización con la federación para rellenar teléfonos y correos.

## 3. Decisiones tomadas (confirmadas por el usuario)

- **Por temporada**, no permanente: la coordinación cambia de un año a otro.
- **Con motivo libre**: sirve también para favores puntuales a un jugador, no solo cargos.
- **Tabla propia**, sin tocar `players` (se comparte con el Portal).
- **Solo jugadores**: los pagos cuelgan de `player_id`; un usuario sin ficha no recibe cuotas.
- Los pendientes ya registrados de un exento **se conservan pero no cuentan**.

## 4. Impacto en el Portal (pendiente de implementar allí)

Team Manager y el Portal **comparten la misma base de datos de Supabase** (`players`, `payments`, calendario de cuotas `season_fee_lines`…). Por tanto la exención afecta a los dos y **hay que implementarla bien en el Portal**; si no, el Portal seguirá tratando como deudores a los exentos.

No se ha visto el código del Portal desde este repo. Cosas a revisar allí:

- ¿Genera o muestra cuotas previstas (matrícula, pago único, equipación) a las familias? Debe saltarse a los exentos de la temporada.
- ¿Calcula deuda, atrasos o envía recordatorios por correo? No deben contar para un exento.
- ¿Permite asignar cuotas masivas o sueltas? Debe excluirlos o avisar.
- **Permisos:** `payment_exemptions` está cerrada a `authenticated`. Si el Portal lee con el JWT del usuario (no con service role) necesita una política propia o una vista/función segura. Cuidado: el motivo puede ser sensible; las familias no deberían leer el de otros jugadores.
- **Contrato común:** «exento = existe una fila `(player_id, season)` en `payment_exemptions`».
- **Idea para no duplicar lógica:** una función SQL `is_payment_exempt(player_id, season)` (o una vista) usada por los dos repos.

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

1. Confirmar con el usuario que las migraciones están aplicadas y probar el flujo de exenciones en pantalla.
2. Decidir cómo se implementa la exención en el Portal (ver sección 4) y si se centraliza en una función SQL.
3. Si se aborda, diseñar los ajustes por mes (sección 5) antes de tocar código.
