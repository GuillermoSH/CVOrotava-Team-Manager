"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faMagnifyingGlass, faPhone } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "@/components/ui/PageHeader";
import { telHref, type PlayerContacts, type TeamContacts } from "@/lib/contacts/groupContacts";

const RELATIONSHIP_LABEL: Record<string, string> = {
  madre: "Madre",
  padre: "Padre",
  tutor: "Tutor/a",
  jugador: "Jugador/a",
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function playerMatches(p: PlayerContacts, q: string) {
  const digits = q.replace(/\D/g, "");
  return (
    norm(p.playerName).includes(q) ||
    p.contacts.some(
      (c) =>
        norm(c.full_name).includes(q) ||
        norm(c.email ?? "").includes(q) ||
        (digits.length >= 3 && (c.phone ?? "").replace(/\D/g, "").includes(digits))
    )
  );
}

export default function ContactsView({
  teams,
  season,
}: Readonly<{ teams: TeamContacts[]; season: string }>) {
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return teams;
    return teams
      .map((t) => ({ ...t, players: t.players.filter((p) => playerMatches(p, q)) }))
      .filter((t) => t.players.length > 0);
  }, [teams, query]);

  const total = teams.reduce((n, t) => n + t.players.length, 0);

  return (
    <div className="flex w-full flex-col text-[var(--text-primary)]">
      <PageHeader
        title="Contactos"
        subtitle={`${total} jugadores con contacto · temporada ${season} · solo visible para administradores`}
      />

      <label className="relative mb-6 block max-w-sm">
        <span className="sr-only">Buscar jugador o contacto</span>
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jugador, familiar, teléfono o correo…"
          className="w-full rounded-xl border border-[var(--form-input-border)] bg-[var(--form-input-bg)] py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--form-placeholder)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)]"
        />
      </label>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          {teams.length === 0 ? "No hay contactos cargados para esta temporada." : "Sin resultados."}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {visible.map((team) => (
            <section key={team.teamId} className="min-w-0">
              <header className="mb-1 flex items-baseline justify-between gap-3 border-b border-[var(--glass-border)] pb-2">
                <h2 className="text-sm font-semibold tracking-tight sm:text-base">{team.teamName}</h2>
                <span className="text-xs tabular-nums text-[var(--text-muted)]">{team.players.length}</span>
              </header>
              <ul className="divide-y divide-[var(--glass-border)]">
                {team.players.map((p) => (
                  <li key={p.playerId} className="py-3">
                    <p className="font-medium">{p.playerName}</p>
                    <ul className="mt-1.5 flex flex-col gap-1.5">
                      {p.contacts.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-col gap-x-4 gap-y-1 text-sm sm:flex-row sm:flex-wrap sm:items-center"
                        >
                          <span className="min-w-0 text-[var(--text-secondary)]">
                            {RELATIONSHIP_LABEL[c.relationship] ?? c.relationship}
                            {c.relationship !== "jugador" ? ` · ${c.full_name}` : ""}
                          </span>
                          {c.phone ? (
                            <a
                              href={telHref(c.phone)}
                              className="inline-flex items-center gap-1.5 text-[var(--accent)] hover:underline"
                            >
                              <FontAwesomeIcon icon={faPhone} className="text-xs" />
                              {c.phone}
                            </a>
                          ) : null}
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex min-w-0 items-center gap-1.5 break-all text-[var(--accent)] hover:underline"
                            >
                              <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                              {c.email}
                            </a>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
