import { useAnimatedText } from './ui/animated-text';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AnimatedMessageProps {
  content: string;
  isAnimating: boolean;
  className?: string;
}

export function AnimatedMessage({ content, isAnimating, className }: AnimatedMessageProps) {
  const animatedContent = useAnimatedText(content, "");
  const displayContent = isAnimating ? animatedContent : content;

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      className={`${className} prose-ul:list-disc prose-ul:pl-6 prose-ul:my-2 prose-li:my-0.5 prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-2`}
      components={{
        ul: ({ children }) => (
          <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="my-0.5">{children}</li>
        ),
      }}
    >
      {displayContent}
    </ReactMarkdown>
  );
}
