#!/usr/bin/env python3
"""提取 PDF 文件内容"""

from pypdf import PdfReader

pdf_path = "./上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"

print("=" * 60)
print("PDF 文件内容提取")
print("=" * 60)

try:
    reader = PdfReader(pdf_path)
    print(f"\nPDF 页数：{len(reader.pages)}")
    
    # 提取元数据
    if reader.metadata:
        print(f"\n元数据:")
        print(f"  标题：{reader.metadata.title}")
        print(f"  作者：{reader.metadata.author}")
        print(f"  创建者：{reader.metadata.creator}")
        print(f"  生产者：{reader.metadata.producer}")
    
    # 提取每页文本
    full_content = []
    for i, page in enumerate(reader.pages):
        page_text = []
        page_text.append(f"\n{'='*60}")
        page_text.append(f"第 {i+1} 页")
        page_text.append(f"{'='*60}")
        text = page.extract_text()
        if text:
            page_text.append(text)
        else:
            page_text.append("[无法提取文本 - 可能是扫描版/图片型 PDF]")
        full_content.append("\n".join(page_text))
        
    result = "\n\n".join(full_content)
    print(result)
    
    # 保存到文件
    with open("./pdf_extracted_content.txt", "w", encoding="utf-8") as f:
        f.write(result)
    print(f"\n✓ 内容已保存到 ./pdf_extracted_content.txt")
        
except Exception as e:
    print(f"错误：{e}")
    import traceback
    traceback.print_exc()
