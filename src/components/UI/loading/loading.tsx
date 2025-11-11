import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    text?: string;
    overlay?: boolean; // nếu true thì che mờ vùng cha
    className?: string;
};

export default function Loading({
    text = "Processing...",
    overlay = false,
    className
}: Props) {
    const base = (
        <div className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", className)}>
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm font-medium">{text}</p>
        </div>
    );

    if (!overlay) return base;

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-20">
            {base}
        </div>
    );
}
