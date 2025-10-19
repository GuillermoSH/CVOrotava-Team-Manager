'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Loading() {
  setTimeout(() => {}, 4000);
  return (
    <main className="flex-1 flex justify-center items-center">
      <div className="flex items-center aspect-square border border-white/30 overflow-hidden bg-white/5 backdrop-blur-sm shadow-lg rounded-lg p-4">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          className="text-5xl text-[#E71F12]"
        />
      </div>
    </main>
  );
}
