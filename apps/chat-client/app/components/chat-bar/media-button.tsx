'use client'

import { PhotoIcon } from "@heroicons/react/24/outline";
import { type ChangeEventHandler } from "react";


export function MediaButton({handleFileChange}: {handleFileChange: ChangeEventHandler<HTMLInputElement> }): JSX.Element {
  return (
    <div>
      <input 
      className="hidden" 
      id="file" 
      name="file" 
      type="file"
      onChange={handleFileChange}
      />
      <label htmlFor="file" className="flex cursor-pointer items-center p-2 hover:bg-gray-100 w-full">
        <PhotoIcon aria-label="Photo" className="h-6 w-6 mr-2"/> Media
      </label>
    </div>
  );
}