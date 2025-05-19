import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trash2, Repeat2 } from "lucide-react";

function Navbar() {
  const location = useLocation();

  return (
    <header className="w-full fixed top-0 z-50 bg-gradient-to-r from-gray-100 to-gray-200 border-b shadow-sm px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="text-base md:text-xl font-bold whitespace-nowrap">
        <Link to="/">📊 폐기물 포털</Link>
      </div>

      <nav className="flex gap-2">
        <Button
          variant={location.pathname === "/waste" ? "default" : "outline"}
          className={`whitespace-nowrap px-3 py-1 text-sm md:text-base ${location.pathname === "/waste" ? "font-bold ring-2 ring-blue-500" : ""}`}
          asChild
        >
          <Link to="/waste" className="flex items-center gap-1">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">폐기물 발생이력</span>
          </Link>
        </Button>

        <Button
          variant={location.pathname === "/recycle" ? "default" : "outline"}
          className={`whitespace-nowrap px-3 py-1 text-sm md:text-base ${location.pathname === "/recycle" ? "font-bold ring-2 ring-green-500" : ""}`}
          asChild
        >
          <Link to="/recycle" className="flex items-center gap-1">
            <Repeat2 className="w-4 h-4" />
            <span className="hidden sm:inline">폐기물 실적업체</span>
          </Link>
        </Button>
      </nav>
    </header>
  );
}

export default Navbar;
