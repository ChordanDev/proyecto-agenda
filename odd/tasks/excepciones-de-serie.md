# Excepciones de una serie (issues #172 and #173)

Objective: change or delete a single date of a series, in the database, the calendar reads and the detail/form. Branches `feat/172-excepciones` → `feat/173-una-fecha` (stacked, one PR each). Runners: Jest (`npm test`), pgTAP (`npm run db:test`).

## Specs

- S1 (#172) Migración: "una excepción por fecha de la serie, anclada en su fecha original, que guarda solo los campos que cambiaron (título, hora, lugar, descripción, énfasis, fecha nueva) o marca la fecha como borrada."
- S2 (#172) RPCs: "guardar la excepción de una fecha y borrar una sola fecha."
- S3 (#172) `guardar_evento`: "al regenerar las fechas de la serie, conserva las excepciones cuya fecha original sigue existiendo, descarta las demás y no vuelve a crear las fechas borradas."
- S4 (#172) Lectura: "`getFechasDelMes` y `getEvento` aplican las excepciones; una fecha movida aparece en su día nuevo y no en el original."
- S5 (#172) Dominio: "combinar la serie con la excepción campo por campo; contar las excepciones que se perderían con un cambio de la serie; validar que una fecha movida no caiga sobre otra fecha de la serie."
- S6 (#172) `GLOSSARY.md`: "**Serie** (un evento que se repite, con todas sus fechas) y **Excepción** (el cambio o el borrado de una sola fecha de una serie)."
- S7 (#172) "La excepción la puede hacer quien tenga un cargo que abarque al dueño, igual que editar la serie." "En una serie compartida, la excepción la hace el dueño y la iglesia sumada la ve tal cual." "Borrar la serie elimina todo, excepciones incluidas."
- S8 (#173) Hoja "Solo el sábado 17 de octubre" / "Toda la serie" / "Cancelar", solo para eventos que se repiten y solo para quien puede editar; "Este evento se repite el tercer sábado de cada mes."
- S9 (#173) Formulario "una fecha": sin dueño, repetición, "Hasta", compartir, fecha de fin; "Estás cambiando solo el sábado 17 de octubre." "Las demás fechas de la serie no cambian."; pie "El dueño, la repetición, "Hasta", la fecha de fin y las iglesias sumadas se cambian en toda la serie."; "Guardar esta fecha"; "solo envía los campos que cambiaron".
- S10 (#173) "Se borra solo el sábado 17 de octubre. Las demás fechas siguen.", con "Borrar el sábado 17".
- S11 (#173) "Esta fecha tiene cambios propios. Las demás fechas de la serie no cambiaron."
- S12 (#173) "2 fechas con cambios propios se van a perder." con cuáles y por qué, "Guardar igual" y "Volver a la serie".
- S13 (#173) "El resto del formulario (hora, lugar, fecha pasada, repetición, compartir) sigue funcionando igual." Editar y borrar exigen conexión.

## Tasks

- T1 S1-S3,S7 migration + pgTAP — inline — done (pgTAP eventos_excepciones 48/48, eventos_guardar 44/44)
- T2 S5 domain rules `excepcion.ts` — inline — done (RED: module missing; GREEN 19/19)
- T3 S4,S6 reads, types, glossary — inline — done (Jest 972/972; types equal to `supabase gen types`; PostgREST selects probed live)
- T4 S8-S13 one-date flow — inline — done (RED: edicionDeFecha module missing, 7 data tests failing; GREEN Jest 1007/1007; screens not verified on a device, see the manual-check issue)

Route: inline (no Writer trigger: sequential units sharing files).

## Log

- L1 (2026-10-19) User: implement #172 then #173, one stacked PR each, label `jorge:required`, do not merge.
- L2 A deleted date removes its `eventos_fechas` row and keeps an `excepciones` row marked `borrada`, so readers that ignore exceptions never show it. Exceptions hang from `eventos` (cascade); `guardar_evento` drops those whose original date is gone.
- L3 Null means "unchanged" for titulo, hora, fecha_nueva; `cambia_*` flags for lugar, descripcion, enfasis, where null is a real value.
- L4 A lost exception counts only when it changed something; a deleted date that leaves the series loses nothing.
- L5 Independent verifier (sonnet) on #172: blocker B1, a date undoing its move (or losing its excepcion) could come back to a day another date moved to. Fixed with a deferred constraint trigger `check_dias_de_serie` on `excepciones` and `eventos_fechas`, an immediate check in `guardar_excepcion`, and `puedeMoverFecha` rejecting the own day once taken. Also: deleted/unknown dates raise 23514 (not P0002, which the app reads as "sin permiso"), and `borrar_fecha` on a date already deleted succeeds. Advisory A2 kept: `getExcepcionesPerdidas` ignores the lugar reset of a duenio change.
- L6 RDD review (reliability lens) approved and acknowledged. Fixed its two warnings: check_excepcion only checks a fecha_nueva or lugar_id that changes (a lugar reset in guardar_evento no longer aborts a duenio change, pgTAP 59/59, RED observed before the fix); the detail does not offer "Solo el…" to delete the last date left.
- L7 Jorge review of #210 (head 7adcaf3): TR-1 blocker fixed (guardar_evento raises 22023 when no date would be left); CD-4 (an empty guardar_excepcion still needs a date of a series); TR-2 (row lock on the evento in guardar_excepcion and borrar_fecha, unique index on (evento_id, fecha_nueva)); SP-1 (check_dias_de_serie looks up only the affected days, cap of 500 fechas, since renewing "Hasta" keeps the first date); CD-3 (getExcepcionesPerdidas counts a lugar-only change lost to a new duenio). TR-3 was already fixed in bbb25e3 by relaxing the trigger. TR-4 (three month reads at different moments) is left. pgTAP 66/66 with RED observed, Jest green.
- L10 Second Jorge review of #210 (head 1e94f1e): approved, one low finding CD-R1 fixed: check_dias_de_serie also checks the day the excepcion of a date written again moved to (pgTAP 67/67, RED observed). TR-5/CD-R2 (22023 shown as "Probá de nuevo") left for #213, SP-2/TR-6 pre-existing.
- L8 Jorge review of #213 (head cc6a683): F1 was already fixed in bf49c96; F2 (useGuardarExcepcion and useBorrarFecha read the evento again on no-existe or fecha-cambiada) and S1 (useBorrarFecha marks the evento stale without refetching while the detail leaves) fixed with hook tests; getAvisoDePerdidas takes the serie as it was and names dates that lose a lugar of the old duenio. Jest 1014/1014.
- L9 Second Jorge review of #213 (head 8236305): TR-C1 fixed (22023 from borrar_fecha is fecha-cambiada, so the evento is read again) and CD-C1 fixed (mixed reasons say the dates lose their own changes); added hook tests for the no-existe branch and for an error that is not about the evento (RDD advisories). Jest 1020/1020.
- L11 RDD advisories on d713ed1: 22023 counts as fecha-cambiada only for borrar_fecha; renamed a hook test; noted the unused singular of mezclados. Jest 1022/1022.
