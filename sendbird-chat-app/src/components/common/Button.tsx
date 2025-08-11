import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export default function Button({ children, onClick, variant = "primary", size = "md", disabled = false, className = "" }: ButtonProps) {
  const baseClasses = "font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantClasses = {
    primary: "bg-blue-500 hover:bg-blue-700 text-white focus:ring-blue-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-700 focus:ring-gray-500",
    success: "bg-green-500 hover:bg-green-700 text-white focus:ring-green-500",
    danger: "bg-red-500 hover:bg-red-700 text-white focus:ring-red-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}>
      {children}
    </button>
  );
}
