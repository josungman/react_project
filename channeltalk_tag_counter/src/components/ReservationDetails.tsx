import { useState, useEffect } from "react";
import { formatTime } from "../utils/timeUtils";

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
  startDate: Date;
  endDate: Date;
}

export default function ReservationDetails({ reservationDetails, maxAmountFilter, startDate, endDate }: ReservationDetailsProps) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700">상세 내역</h3>
            <p className="text-sm text-gray-600">
              기간: {formatTime.dateOnly(startDate)} ~ {formatTime.dateOnly(endDate)}
            </p>
          </div>
          {/* 검색 필터 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="customerSearch" className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
              송금자명 검색:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="customerSearch"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // 검색 시 첫 페이지로 이동
                }}
                placeholder="송금자명을 입력하세요"
                className="w-full sm:w-48 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="itemsPerPage" className="text-xs sm:text-sm text-gray-600">
              표시:
            </label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // 페이지당 항목 수 변경 시 첫 페이지로 이동
              }}
              className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={15}>15개</option>
              <option value={20}>20개</option>
            </select>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
            총 {sortedData.length}건 (페이지 {currentPage} / {totalPages})
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th
                className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
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
                  <span className="hidden sm:inline">날짜/시간</span>
                  <span className="sm:hidden text-xs">날짜</span>
                  {sortField === "date" && <span className="text-blue-600 text-xs sm:text-sm">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
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
                  <span className="hidden sm:inline">송금자명</span>
                  <span className="sm:hidden text-xs">송금자</span>
                  {sortField === "customerName" && <span className="text-blue-600 text-xs sm:text-sm">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
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
                  <span className="hidden sm:inline">송금은행</span>
                  <span className="sm:hidden text-xs">은행</span>
                  {sortField === "depositBank" && <span className="text-blue-600 text-xs sm:text-sm">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-left font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
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
                  <span className="hidden sm:inline">입금계좌번호</span>
                  <span className="sm:hidden text-xs">계좌번호</span>
                  {sortField === "accountNumber" && <span className="text-blue-600 text-xs sm:text-sm">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
              <th
                className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-right font-medium text-gray-700 border-b cursor-pointer hover:bg-gray-100 select-none"
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
                  <span className="hidden sm:inline">예약금 (원)</span>
                  <span className="sm:hidden text-xs">예약금</span>
                  {sortField === "amount" && <span className="text-blue-600 text-xs sm:text-sm">{sortDirection === "asc" ? "↑" : "↓"}</span>}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr key={startIndex + index} className="hover:bg-gray-50">
                <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-gray-900 border-b text-xs sm:text-sm">
                  {item.date} {item.time}
                </td>
                <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-gray-900 border-b break-words text-xs sm:text-sm">{item.customerName}</td>
                <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-gray-900 border-b break-words text-xs sm:text-sm">{item.depositBank}</td>
                <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-gray-900 border-b break-words text-xs sm:text-sm">{item.accountNumber}</td>
                <td className="px-1 sm:px-2 md:px-4 py-1 sm:py-1.5 text-gray-900 border-b text-right break-words text-xs sm:text-sm">{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이징 컨트롤 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4 sm:mt-6 space-x-1 sm:space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded-md ${
                  currentPage === pageNum ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
