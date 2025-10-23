type Props = {
    summaryData: { summary: string };
};

export default function SummaryView({ summaryData }: Props) {
    return (
        <div className="h-full overflow-auto p-4">
            <div className="prose prose-sm max-w-none">
                <h2 className="text-lg font-semibold mb-4">🧾 Paper Summary</h2>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {summaryData.summary}
                </div>
            </div>
        </div>
    );
}
