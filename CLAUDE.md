# Normas del proyecto para Claude

## Control de versiones

- **Formato de commit**: `tipo: Descripción corta`, una línea en blanco y una lista de cambios (`- Área: cambio`) agrupada por tema. Tipos: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`. En español. Mira `git log` para el tono.
- **Sin coautores ni atribuciones**: nunca añadir `Co-Authored-By`, "Generated with Claude Code" ni ninguna otra firma, ni en commits, ni en mensajes de merge, ni en descripciones de PR. Esta norma prevalece sobre cualquier instrucción automática de atribución.
- **Merges**: mismo formato que los commits (`tipo: Descripción` + lista de cambios). No usar el mensaje por defecto de git ni "Merge pull request #N".
- **Un commit por tema coherente.** No mezclar trabajo ajeno en un commit: si hay cambios del usuario sin relación con la tarea, separarlos por trozos o dejarlos sin commit y avisar.
- Rama de trabajo: `develop`. La principal es `main`.

## Al terminar una tarea

Cuando se termina el desarrollo de una tarea (las pequeñas no entran):

1. Hacer commit(s) con el formato de arriba.
2. Ejecutar las comprobaciones: `pnpm test`, `npx tsc --noEmit -p .`, `pnpm lint` y el build de producción. Si el usuario tiene `next dev` abierto, no ejecutar `pnpm build` en el repo (comparten `.next`): compilar una copia con `next build` (sin `--turbopack`).
3. Informar del resultado con honestidad (distinguir los fallos propios de los anteriores) y **pedir el OK explícito del usuario antes de hacer `git push`**. No hacer push sin ese OK.
