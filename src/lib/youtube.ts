// Extrae el ID de un video de YouTube a partir de la URL
export function getYouTubeId(url: string): string | null {
    try {
        const parsedUrl = new URL(url);

        if (parsedUrl.hostname === "youtu.be") {
            return parsedUrl.pathname.slice(1);
        }

        if (parsedUrl.hostname.includes("youtube.com")) {
            return parsedUrl.searchParams.get("v");
        }

        return null;
    } catch {
        return null;
    }
}

// Devuelve la URL de la miniatura en distintas calidades
export function getThumbnailUrl(
    url: string,
    quality: "mq" | "hq" | "max" = "hq"
): string {
    const id = getYouTubeId(url);
    if (!id) return "";

    switch (quality) {
        case "mq":
            return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        case "max":
            return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        default:
            return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
}

// Devuelve el titulo del video
export async function getYoutubeTitle(videoId?: string): Promise<string | null> {
    if (!videoId) return null;

    const apiKey = process.env.YOUTUBE_API_KEY!;
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        return data.items?.[0]?.snippet?.title || null;
    } catch (err) {
        console.error("Error fetching YouTube title:", err);
        return null;
    }
}

