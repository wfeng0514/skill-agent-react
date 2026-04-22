import pdfplumber
import json

# 读取 PDF 文件
pdf_path = "上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"

all_text = []
all_tables = []

with pdfplumber.open(pdf_path) as pdf:
    print(f"PDF 页数：{len(pdf.pages)}")
    print("=" * 60)
    
    for i, page in enumerate(pdf.pages):
        page_text = f"\n=== 第 {i+1} 页 ===\n"
        print(page_text)
        all_text.append(page_text)
        
        # 提取文本
        text = page.extract_text()
        if text:
            print(text)
            all_text.append(text)
        else:
            no_text = "[无法提取文本，可能是扫描版/图片版 PDF]"
            print(no_text)
            all_text.append(no_text)
        
        # 提取表格
        tables = page.extract_tables()
        if tables:
            table_text = "\n[表格内容]"
            print(table_text)
            all_text.append(table_text)
            
            for j, table in enumerate(tables):
                table_header = f"\n表格 {j+1}:"
                print(table_header)
                all_text.append(table_header)
                
                for row in table:
                    row_str = str(row)
                    print(row_str)
                    all_text.append(row_str)
                    all_tables.append(row)

# 保存到文件
with open("invoice_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(all_text))

print("\n\n" + "=" * 60)
print("结果已保存到 invoice_output.txt")
