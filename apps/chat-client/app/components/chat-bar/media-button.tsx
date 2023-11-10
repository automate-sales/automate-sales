'use client'

import { PhotoIcon } from "@heroicons/react/24/outline";
import type { FormEvent } from "react";

export function MediaButton(): JSX.Element {
  async function handleSubmit(event: FormEvent): Promise<void> {
      event.preventDefault();

      const formData = new FormData(event.currentTarget as HTMLFormElement);
        try{
       const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if(!res.ok){
          throw new Error("Network response was not ok");
        }
        const { mediaKey } = await res.json();
        console.log(mediaKey);
        }
        catch(error){
          console.error("There was an error uploading the file.", error);
        }
        
  }

  return (
    <form onSubmit={handleSubmit}>
      <input className="hidden" id="file" name="file" type="file"/>
      <label htmlFor="file" className="flex cursor-pointer items-center p-2 hover:bg-gray-100 w-full">
        <PhotoIcon aria-label="Photo" className="h-6 w-6 mr-2"/> Media
      </label>
    </form>
  );
  }