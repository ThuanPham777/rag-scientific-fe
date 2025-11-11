import { useState } from "react";

type Props = {
    onSelect: (text: string) => void;
    disabled?: boolean;
};

export default function ChatSuggestions({ onSelect, disabled = false }: Props) {
    const [suggestions] = useState<string[]>([
        "Practical Implications",
        "Explain Abstract",
        "Dataset used",
        "Literature survey",
        "Methods used",
        "Contributions",
        "Limitations",
    ]);

    return (
        <div className="px-4 pt-6 pb-1 flex-shrink-0">
            <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => !disabled && onSelect(s)}
                        disabled={disabled}
                        className="px-3 py-1.5 rounded-full border border-gray-300 bg-white text-sm text-gray-700
                       hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
