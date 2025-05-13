import os
import win32com.client

def convert_xls_to_xlsx(folder_path):
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    excel.DisplayAlerts = False

    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(".xls") and not file.startswith("~$"):
                xls_path = os.path.abspath(os.path.join(root, file))  # ✅ 절대경로 처리
                xlsx_path = xls_path + "x"  # 예: xxx.xls → xxx.xlsx

                try:
                    print(f"📄 변환 중: {xls_path}")
                    wb = excel.Workbooks.Open(xls_path)
                    wb.SaveAs(xlsx_path, FileFormat=51)
                    wb.Close()
                    print(f"✅ 저장 완료: {xlsx_path}")
                except Exception as e:
                    print(f"❌ 오류 발생: {xls_path} → {e}")

    excel.Quit()
    print("🎉 모든 변환 완료")

# 예시 실행
convert_xls_to_xlsx(r"폐기물데이터_xls\생활(가정)폐기물발생량\2022")
