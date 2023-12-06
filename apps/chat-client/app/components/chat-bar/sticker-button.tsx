'use client'

import { StarIcon } from "@heroicons/react/24/outline";
import { type ChangeEventHandler } from "react";


export function StickerButton({handleFileChange}: {handleFileChange: ChangeEventHandler<HTMLInputElement> }): JSX.Element {
  return (
    <div>
      <input 
      className="hidden" 
      id="sticker" 
      name="sticker" 
      type="file"
      onChange={handleFileChange}
      />
      <label htmlFor="sticker" className="flex cursor-pointer items-center p-2 hover:bg-gray-100 w-full">
        <StarIcon className="h-6 w-6 mr-2" /> New Sticker
      </label>
    </div>
  );
}