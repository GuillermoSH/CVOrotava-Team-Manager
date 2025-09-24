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
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
            <Image
                src={getThumbnailUrl(url, "hq")}
                alt={title || "Video"}
                width={320}
                height={180}
                className="w-full h-auto rounded"
            />
            <h2 className="mt-2 text-lg font-bold">{title || "Cargando..."}</h2>
            <p className="text-sm text-gray-500">{category}</p>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
                Ver video
            </a>
        </div>
    );
}
