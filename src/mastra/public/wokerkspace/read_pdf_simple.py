from pypdf import PdfReader

pdf_path = "上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"

reader = PdfReader(pdf_path)

print(f"PDF 页数：{len(reader.pages)}")
print("=" * 60)

full_text = []

for i, page in enumerate(reader.pages):
    page_header = f"\n=== 第 {i+1} 页 ===\n"
    print(page_header)
    full_text.append(page_header)
    
    text = page.extract_text()
    if text:
        print(text)
        full_text.append(text)
    else:
        no_text = "[无法提取文本，可能是扫描版/图片版 PDF]"
        print(no_text)
        full_text.append(no_text)

# 保存结果
with open("invoice_pypdf_output.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(full_text))

print("\n\n" + "=" * 60)
print("结果已保存到 invoice_pypdf_output.txt")
