import React, { useRef, useEffect, useState } from 'react';

function parseTemplate(template: any) {
    const segments = [];
    let remainingText = template.body;

    template.variables.forEach(variable => {
        const parts = remainingText.split(`{{${variable}}}`);
        segments.push(parts[0]);
        segments.push({ variable });
        remainingText = parts[1];
    });

    if (remainingText) {
        segments.push(remainingText);
    }

    return segments;
}

export const TemplateInput = ({ template, isLoading }) => {
    const segments = parseTemplate(template);
    const mirrorRef = useRef(null);
    const [inputValues, setInputValues] = useState(() => {
        const initialInputValues = {};
        segments.forEach(segment => {
            if (typeof segment !== 'string') {
                initialInputValues[segment.variable] = '';
            }
        });
        return initialInputValues;
    });
    const [fullTemplate, setFullTemplate] = useState(template.body);

    useEffect(() => {
        let currentTemplate = template.body;
        Object.keys(inputValues).forEach(key => {
            currentTemplate = currentTemplate.replace(new RegExp(`{{${key}}}`, 'g'), `{{${inputValues[key]}}}`);
        });
        setFullTemplate(currentTemplate);
    }, [inputValues]); // Only re-run if inputValues changes
    
    useEffect(() => { 
        console.log('USING EFFECT ', inputValues)
        // set the width of all the inputs to the width of the mirror span
        const inputElements = document.querySelectorAll('input');
        inputElements.forEach(inputElement => {
            const mirrorSpan = mirrorRef.current;
            if (mirrorSpan) {
                mirrorSpan.textContent = inputElement.value || inputElement.placeholder;
                inputElement.style.width = `${mirrorSpan.offsetWidth}px`;
            }
        });
    }, [])
        
    const updateInputValues = (variable, value) => {
        setInputValues(prev => ({ ...prev, [variable]: value }));
    };

    const handleInputChange = (e) => {
        const inputElement = e.target;
        const mirrorSpan = mirrorRef.current;

        if (mirrorSpan) {
            mirrorSpan.textContent = inputElement.value || inputElement.placeholder;
            inputElement.style.width = `${mirrorSpan.offsetWidth}px`;
        }

        updateInputValues(inputElement.name, inputElement.value);
    };

    console.log('FULL TEMPLATE ', fullTemplate)

    return (
        <div className={`flex flex-grow items-center rounded-full px-4 py-2 transition-all duration-150 ${isLoading ? 'bg-gray-400 text-gray-300' : 'bg-gray-100'}`}>
            <span ref={mirrorRef} className="absolute left-0 top-0 h-0 overflow-hidden whitespace-pre" aria-hidden="true"></span>
            {segments.map((segment, index) =>
                typeof segment === 'string' ? (
                    <span key={index}>{segment}</span>
                ) : (
                    <div key={index} className='px-1'>
                        <input
                            className="bg-transparent focus:outline-none"
                            type="text"
                            name={segment.variable}
                            placeholder={segment.variable}
                            onChange={handleInputChange}
                        />
                    </div>
                )
            )}
        </div>
    );
};