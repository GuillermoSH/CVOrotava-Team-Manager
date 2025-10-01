// Extrae el ID de un video de YouTube a partir de la URL
export function getYouTubeId(url: string): string | null {
    const parsedUrl = new URL(url);

    // Caso típico: https://www.youtube.com/watch?v=VIDEO_ID
    if (parsedUrl.searchParams.has("v")) {
        return parsedUrl.searchParams.get("v");
    }

    // Caso live: https://www.youtube.com/live/VIDEO_ID
    if (parsedUrl.pathname.startsWith("/live/")) {
        return parsedUrl.pathname.split("/live/")[1];
    }

    // Caso short: https://youtu.be/VIDEO_ID
    if (parsedUrl.hostname === "youtu.be") {
        return parsedUrl.pathname.substring(1);
    }

    return null;
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

export async function getYoutubeTitle(url: string): Promise<string | null> {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YouTube API key not set");
    return null;
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) {
      console.error("YouTube API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.items?.[0]?.snippet?.title || null;
  } catch (err) {
    console.error("Error fetching YouTube title:", err);
    return null;
  }
}

