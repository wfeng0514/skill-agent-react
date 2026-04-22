import pdfplumber
import json

pdf_path = "上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"

result = {
    "pages": [],
    "all_text": "",
    "tables": []
}

with pdfplumber.open(pdf_path) as pdf:
    result["num_pages"] = len(pdf.pages)
    
    for i, page in enumerate(pdf.pages):
        page_data = {
            "page_number": i + 1,
            "text": "",
            "tables": []
        }
        
        # 提取文本
        text = page.extract_text()
        if text:
            page_data["text"] = text
            result["all_text"] += f"\n=== 第 {i+1} 页 ===\n" + text
        else:
            page_data["text"] = "[无法提取文本]"
            result["all_text"] += f"\n=== 第 {i+1} 页 ===\n[无法提取文本]"
        
        # 提取表格
        tables = page.extract_tables()
        if tables:
            for j, table in enumerate(tables):
                page_data["tables"].append({
                    "table_number": j + 1,
                    "rows": table
                })
                result["tables"].append({
                    "page": i + 1,
                    "table_number": j + 1,
                    "rows": table
                })
        
        result["pages"].append(page_data)

# 保存为 JSON
with open("invoice_data.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

# 保存为文本
with open("invoice_text.txt", "w", encoding="utf-8") as f:
    f.write(result["all_text"])
    
    if result["tables"]:
        f.write("\n\n=== 表格内容 ===\n")
        for table in result["tables"]:
            f.write(f"\n第 {table['page']} 页，表格 {table['table_number']}:\n")
            for row in table["rows"]:
                f.write(str(row) + "\n")

print(f"PDF 页数：{result['num_pages']}")
print(f"提取的文本长度：{len(result['all_text'])} 字符")
print(f"提取的表格数：{len(result['tables'])}")
print("\n结果已保存到:")
print("  - invoice_data.json")
print("  - invoice_text.txt")

# 打印文本内容
print("\n" + "=" * 60)
print("PDF 内容:")
print("=" * 60)
print(result["all_text"])

if result["tables"]:
    print("\n" + "=" * 60)
    print("表格内容:")
    print("=" * 60)
    for table in result["tables"]:
        print(f"\n第 {table['page']} 页，表格 {table['table_number']}:")
        for row in table["rows"]:
            print(row)
