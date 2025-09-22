'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          className="text-5xl text-blue-500"
        />
        <p className="text-lg font-medium text-gray-700">Loading...</p>
      </div>
    </div>
  );
}
