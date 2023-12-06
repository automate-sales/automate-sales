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

    return (
        <div className={`flex-grow gap-1 flex items-center rounded-full px-4 py-2 transition-all duration-150 ${isLoading ? 'bg-gray-400 text-gray-300' : 'bg-gray-100'}`}>
            {segments.map((segment, index) =>
                typeof segment === 'string' ? (
                    <span key={index}>{segment}</span>
                ) : (
                    <input
                        key={index}
                        className="bg-transparent focus:outline-none"
                        type="text"
                        name={segment.variable}
                        placeholder={segment.variable}
                        style={{ width: (segment.variable.length + 1) + "ch" }}
                    />
                )
            )}
        </div>
    );
};


