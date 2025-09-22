"use client";
import GoogleBtn from "@/components/GoogleBtn";

export default function LoginPage() {

  return (
    <div className="flex items-center justify-center min-h-screen bg-[url('/assets/svgs/crystal-light.svg')] bg-center bg-cover px-4">
      <div className="w-full max-w-[400px] py-8 px-10 space-y-6 hover:shadow-xl duration-200 border border-white/30 rounded-lg overflow-hidden bg-white/20 backdrop-blur-sm shadow-lg">
        {/* Botón Google */}
        <div className="w-full">
          <GoogleBtn />
        </div>
      </div>
    </div>
  );
}