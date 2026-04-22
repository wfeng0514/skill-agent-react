#!/usr/bin/env python3
from pypdf import PdfReader

pdf_path = "./上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"
reader = PdfReader(pdf_path)

print(f"PDF 页数：{len(reader.pages)}\n")

for i, page in enumerate(reader.pages):
    print(f"=== 第 {i+1} 页 ===")
    text = page.extract_text()
    print(text if text else "[无法提取文本]")
    print()
