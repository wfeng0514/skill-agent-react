import pdfplumber
import sys

pdf_path = "./skills/上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"

try:
    with pdfplumber.open(pdf_path) as pdf:
        print(f"PDF 页数：{len(pdf.pages)}")
        print("=" * 60)
        
        for i, page in enumerate(pdf.pages):
            print(f"\n--- 第 {i+1} 页 ---")
            text = page.extract_text()
            if text:
                print(text)
            else:
                print("[无法提取文本，可能是扫描版 PDF]")
            
            # 尝试提取表格
            tables = page.extract_tables()
            if tables:
                print(f"\n[表格内容 - 共 {len(tables)} 个表格]")
                for j, table in enumerate(tables):
                    print(f"\n表格 {j+1}:")
                    for row in table:
                        print(row)
                        
except Exception as e:
    print(f"错误：{e}")
    # 尝试使用 pypdf
    try:
        from pypdf import PdfReader
        print("\n尝试使用 pypdf 读取...")
        reader = PdfReader(pdf_path)
        print(f"PDF 页数：{len(reader.pages)}")
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            print(f"\n--- 第 {i+1} 页 ---")
            print(text if text else "[无法提取文本]")
    except Exception as e2:
        print(f"pypdf 也失败：{e2}")
