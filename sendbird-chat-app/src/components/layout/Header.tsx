import { useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
  pages: Array<{
    id: string;
    label: string;
    icon?: string;
    path: string;
  }>;
}

export default function Header({ pages }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = pages.find((page) => page.path === location.pathname)?.id || "main";

  const handlePageChange = (pageId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (page) {
      navigate(page.path);
    }
  };

  const handleMainClick = () => {
    navigate("/main");
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button onClick={handleMainClick} className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
              SendBird Test
            </button>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handlePageChange(page.id)}
                className={`hidden sm:flex px-3 py-2 rounded-lg font-medium transition-colors items-center space-x-2 ${
                  currentPage === page.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                title={page.label}
              >
                {page.icon && <span>{page.icon}</span>}
                <span className="truncate max-w-[8rem]">{page.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
