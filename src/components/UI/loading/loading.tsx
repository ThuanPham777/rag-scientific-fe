import { Loader2 } from "lucide-react";

type Props = {
    text?: string;
    overlay?: boolean; // nếu true thì che mờ vùng cha
};

export default function Loading({ text = "Processing...", overlay = false }: Props) {
    const base = (
        <div className="flex flex-col items-center justify-center gap-2 text-gray-700">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <p className="text-sm font-medium">{text}</p>
        </div>
    );

    if (!overlay) return base;

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-20">
            {base}
        </div>
    );
}
