import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { seniorPlayerDisplayName } from "@/lib/payments/seniorPlayers";

/** Nombre de la ficha de jugador enlazada a la cuenta (la más reciente), si existe. */
const playerNameByUserId = cache(
  async (userId: string): Promise<string | null> => {
    const { data, error } = await supabaseAdmin
      .from("players")
      .select("full_name, first_name, last_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    const name = seniorPlayerDisplayName(data);
    return name === "Sin nombre" ? null : name;
  }
);

/**
 * Nombre a mostrar en la app: el del jugador para todos menos los
 * administradores (que usan el de su usuario). Sin ficha, cae al del usuario.
 */
export async function resolveDisplayName(user: {
  id: string;
  isAdmin: boolean;
  user_name: string;
}): Promise<string> {
  if (user.isAdmin) return user.user_name;
  return (await playerNameByUserId(user.id)) ?? user.user_name;
}
