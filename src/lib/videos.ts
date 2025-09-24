import { supabase } from "@/lib/supabaseClient";

export async function getVideosByCategory(category: "match" | "training") {
    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return [];
    }

    return data;
}
