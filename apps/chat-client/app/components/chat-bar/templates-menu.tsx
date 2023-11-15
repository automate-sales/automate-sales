'use client'

import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface Template {
    name: string;
}
const templates: Template[] = [{ name: 'welcome' }, { name: 'hello' }];

export function TemplatesMenu(): JSX.Element {
    const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    
    const handleTemplateClick = (templateName: string): void => {
        console.log(`${templateName} template clicked`);
        setMessage(templateName);
    };

    return (
        <div>
            <button className="flex items-center" onClick={() => { setIsTemplatesOpen(!isTemplatesOpen); }} type="button">
                <span>Templates</span>
                <ChevronRightIcon className={`h-5 w-5 transform ${isTemplatesOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
            </button>
            <div className={`transition-[max-height] duration-500 ease-in-out ${isTemplatesOpen ? 'max-h-56' : 'max-h-0'} overflow-hidden`}>
                <div className='pt-1 pb-4 flex flex-wrap gap-2'>
                    {templates.map((template) => (
                        <button className="bg-gray-100 hover:bg-gray-200 text-center p-1 rounded-sm" key={template.name} onClick={() => handleTemplateClick(template.name)} type="button">
                            {template.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};