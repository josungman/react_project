import { Link } from "react-router-dom";
import { Home } from "lucide-react";

interface NavigationHeaderProps {
  title: string;
  showHomeButton?: boolean;
  rightContent?: React.ReactNode;
}

export default function NavigationHeader({ title, showHomeButton = true, rightContent }: NavigationHeaderProps) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showHomeButton && (
              <Link to="/" className="flex items-center gap-2 text-gray-800 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-gray-100">
                <Home size={24} />
                <span className="text-sm font-medium">홈</span>
              </Link>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900">{title}</h1>

          <div className="flex items-center gap-2">{rightContent}</div>
        </div>
      </div>
    </nav>
  );
}
