import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: "sm" | "md" | "lg" | "xl";
  hover?: boolean;
}

export default function Card({ children, className = "", shadow = "md", hover = false }: CardProps) {
  const baseClasses = "bg-white rounded-lg border border-gray-200";

  const shadowClasses = {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
  };

  const hoverClasses = hover ? "hover:shadow-lg transition-shadow duration-200" : "";

  return <div className={`${baseClasses} ${shadowClasses[shadow]} ${hoverClasses} ${className}`}>{children}</div>;
}
