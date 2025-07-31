import { useState, useEffect } from "react";

interface ReservationDetail {
  date: string;
  time: string;
  customerName: string;
  amount: number;
  depositBank: string;
  accountNumber: string;
}

interface ReservationDetailsProps {
  reservationDetails: ReservationDetail[];
  maxAmountFilter: number;
}

export default function ReservationDetails({ reservationDetails, maxAmountFilter }: ReservationDetailsProps) {
  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem("reservationItemsPerPage");
    return saved ? parseInt(saved, 10) : 10;
  });

  // 정렬 상태
  const [sortField, setSortField] = useState<"date" | "time" | "customerName" | "amount" | "depositBank" | "accountNumber">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState("");

  // itemsPerPage가 변경될 때 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem("reservationItemsPerPage", itemsPerPage.toString());
  }, [itemsPerPage]);

  // 금액 필터와 검색어 적용된 데이터
  const filteredData = reservationDetails.filter((item) => item.amount <= maxAmountFilter && item.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

  // 정렬 함수
  const sortData = (data: ReservationDetail[]) => {
    return [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "date":
          aValue = new Date(`2024/${a.date}`).getTime();
          bValue = new Date(`2024/${b.date}`).getTime();
          break;
        case "time":
          aValue = a.time;
          bValue = b.time;
          break;
        case "customerName":
          aValue = a.customerName;
          bValue = b.customerName;
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "depositBank":
          aValue = a.depositBank;
          bValue = b.depositBank;
          break;
        case "accountNumber":
          aValue = a.accountNumber;
          bValue = b.accountNumber;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  // 정렬된 데이터
  const sortedData = sortData(filteredData);

  // 페이징 계산
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedData.slice(startIndex, endIndex);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h3 className="text-lg font-semibold text-gray-700">상세 내역</h3>
          {/* 검색 필터 */}
          <div className="flex items-center gap-2">
            <label htmlFor="customerSearch" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              송금자명 검색:
            </label>
            <input
              type="text"
              id="customerSearch"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // 검색 시 첫 페이지로 이동
              }}
              placeholder="송금자명을 입력하세요"
              className="w-48 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
              표시:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // 페이지당 항목 수 변경 시 첫 페이지로 이동
              }}
              className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={15}>15개</option>
              <option value={20}>20개</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            총 {sortedData.length}건 (페이지 {currentPage} / {totalPages})
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th
                className="px-4 py-1.5 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => {
                  if (sortField === "date") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("date");
                    setSortDirection("asc");
                  }
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center gap-1">
                  날짜/시간
                  {sortField === "date" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-4 py-1.5 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => {
                  if (sortField === "customerName") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("customerName");
                    setSortDirection("asc");
                  }
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center gap-1">
                  송금자명
                  {sortField === "customerName" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-4 py-1.5 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => {
                  if (sortField === "depositBank") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("depositBank");
                    setSortDirection("asc");
                  }
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center gap-1">
                  송금은행
                  {sortField === "depositBank" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-4 py-1.5 text-left text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => {
                  if (sortField === "accountNumber") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("accountNumber");
                    setSortDirection("asc");
                  }
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center gap-1">
                  입금계좌번호
                  {sortField === "accountNumber" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-4 py-1.5 text-right text-sm font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
                onClick={() => {
                  if (sortField === "amount") {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                  } else {
                    setSortField("amount");
                    setSortDirection("asc");
                  }
                  setCurrentPage(1);
                }}
              >
                <div className="flex items-center justify-end gap-1">
                  예약금 (원)
                  {sortField === "amount" && <span className="text-blue-600">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr key={startIndex + index} className="hover:bg-gray-50">
                <td className="px-4 py-1.5 text-sm text-gray-900 border-b">
                  {item.date} {item.time}
                </td>
                <td className="px-4 py-1.5 text-sm text-gray-900 border-b">{item.customerName}</td>
                <td className="px-4 py-1.5 text-sm text-gray-900 border-b">{item.depositBank}</td>
                <td className="px-4 py-1.5 text-sm text-gray-900 border-b">{item.accountNumber}</td>
                <td className="px-4 py-1.5 text-sm text-gray-900 border-b text-right">{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이징 컨트롤 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6 space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"}`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
