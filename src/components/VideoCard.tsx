import Image from "next/image";
import { getThumbnailUrl, getYoutubeTitle } from "@/lib/youtube";

type VideoCardProps = {
    url: string;
    category: string;
};

export default async function VideoCard({ url, category }: Readonly<VideoCardProps>) {
    const videoId = url.split("v=")[1] || url.split("/").pop();
    const title = await getYoutubeTitle(videoId);

    return (
        <div className="border border-white/30 overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg rounded-lg p-4 flex flex-col md:flex-row gap-2">
            <div className="w-full md:w-1/3 relative aspect-video">
                <Image
                    src={getThumbnailUrl(url, "max")}
                    alt={title || "Video"}
                    fill
                    className="object-cover rounded-md"
                />
            </div>
            <div className="flex flex-col justify-between gap-2">
                <h2 className="text-md font-bold">{title || "Cargando..."}</h2>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 text-md bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition"
                >
                    Ver video
                </a>
            </div>
        </div>
    );
}
