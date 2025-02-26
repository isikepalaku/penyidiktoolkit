import { CornerRightUp } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "./textarea";
import { cn } from "../../utils/utils";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";
import { Label } from "./label";

interface AIInputWithLoadingProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  loadingDuration?: number;
  thinkingDuration?: number;
  onSubmit?: (value: string) => void | Promise<void>;
  className?: string;
  autoAnimate?: boolean;
  disabled?: boolean;
}

export function AIInputWithLoading({
  id = "ai-input-with-loading",
  placeholder = "Ketik pesan Anda...",
  minHeight = 56,
  maxHeight = 200,
  loadingDuration = 3000,
  thinkingDuration = 1000,
  onSubmit,
  className,
  autoAnimate = false,
  disabled = false
}: AIInputWithLoadingProps) {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(autoAnimate);
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
    maxHeight,
  });

  useEffect(() => {
    if (!autoAnimate) return;

    let timeoutId: NodeJS.Timeout;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, thinkingDuration);
      }, loadingDuration);
    };

    runAnimation();
    return () => clearTimeout(timeoutId);
  }, [autoAnimate, loadingDuration, thinkingDuration]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || submitted || disabled) return;
    
    setSubmitted(true);
    await onSubmit?.(inputValue);
    setInputValue("");
    adjustHeight(true);
    
    setTimeout(() => {
      setSubmitted(false);
    }, loadingDuration);
  };

  return (
    <div className={cn("w-full py-4", className)} onClick={(e) => e.stopPropagation()}>
      <div className="relative max-w-xl w-full mx-auto flex items-start flex-col gap-2">
        <Label htmlFor={id} className="sr-only">
          Pesan Chat
        </Label>
        <div className="relative max-w-xl w-full mx-auto" onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !disabled) {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }
        }}>
          <Textarea
            id={id}
            name="chat-message"
            placeholder={placeholder}
            className={cn(
              "max-w-xl bg-black/5 dark:bg-white/5 w-full rounded-3xl pl-6 pr-10 py-4",
              "placeholder:text-black/70 dark:placeholder:text-white/70",
              "border-none ring-black/30 dark:ring-white/30",
              "text-black dark:text-white resize-none text-wrap leading-[1.2]",
              disabled && "opacity-50 cursor-not-allowed",
              `min-h-[${minHeight}px]`
            )}
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              if (!disabled) {
                setInputValue(e.target.value);
                adjustHeight();
              }
            }}
            disabled={submitted || disabled}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-xl py-1 px-1",
              submitted || disabled ? "bg-none" : "bg-black/5 dark:bg-white/5",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            type="button"
            disabled={submitted || disabled}
            aria-label="Kirim pesan"
          >
            {submitted ? (
              <div
                className="w-4 h-4 bg-black dark:bg-white rounded-sm animate-spin transition duration-700"
                style={{ animationDuration: "3s" }}
              />
            ) : (
              <CornerRightUp
                className={cn(
                  "w-4 h-4 transition-opacity dark:text-white",
                  inputValue && !disabled ? "opacity-100" : "opacity-30"
                )}
              />
            )}
          </button>
        </div>
        <p className="pl-4 h-4 text-xs mx-auto text-black/70 dark:text-white/70">
          {submitted ? "AI sedang berpikir..." : disabled ? "Memuat..." : "Siap mengirim!"}
        </p>
      </div>
    </div>
  );
}
