"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

interface Props {
    content: string;
    className?: string;
}

export const MarkdownMessage = ({ content, className }: Props) => {
    return (
        <div
            className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "prose-p:my-1 prose-headings:my-2",
                "prose-pre:bg-muted prose-pre:p-2 prose-pre:rounded",
                "prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-xs",
                className
            )}
            style={{
                wordBreak: "break-word",
                overflowWrap: "anywhere"
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    // Override paragraph to reduce spacing
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    // Make code blocks scrollable
                    pre: ({ children }) => (
                        <pre className="overflow-x-auto max-w-full">{children}</pre>
                    ),
                    // Style inline code
                    code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        if (isBlock) {
                            return <code className={className}>{children}</code>;
                        }
                        return (
                            <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};
