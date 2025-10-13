"use client";
import GoogleBtn from "@/components/ui/GoogleBtn";
import Image from "next/image";

export default function LoginPage() {

    return (
        <main className="flex items-center justify-center min-h-[100svh] px-4 bg-[url(/assets/svgs/blurry-gradient-RW.svg)] dark:bg-[url(/assets/svgs/blurry-gradient-RB.svg)] bg-center bg-cover">
            <div className="flex flex-col justify-center items-center w-full max-w-[350px] py-8 px-10 space-y-6 hover:shadow-xl duration-200 border border-white/30 rounded-lg overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg">
                <div className="relative w-2/5 bg-[#1C1C1A] aspect-square rounded-full overflow-hidden flex items-center justify-center border border-white/30">
                    <Image
                        src="/assets/imgs/voleipuerto_128x128.webp"
                        alt="Logo Voleipuerto"
                        width={90}
                        height={90}
                    />
                </div>
                <div className="w-full text-center">
                    <h1 className="font-bold text-[#1C1C1A] dark:text-white text-lg">C.V. Orotava - Pto. de la Cruz</h1>
                    <h2 className="text-black/50 dark:text-white/50 text-sm">Cuadro de mando</h2>
                </div>
                <hr className="w-full border-white/30"></hr>
                <div className="w-full">
                    <GoogleBtn />
                </div>
            </div>
        </main>
    );
}