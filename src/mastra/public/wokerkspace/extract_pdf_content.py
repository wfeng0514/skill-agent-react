#!/usr/bin/env python3
"""提取 PDF 文件内容"""

from pypdf import PdfReader

pdf_path = "./skills/上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"

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
    for i, page in enumerate(reader.pages):
        print(f"\n{'='*60}")
        print(f"第 {i+1} 页")
        print(f"{'='*60}")
        text = page.extract_text()
        if text:
            print(text)
        else:
            print("[无法提取文本 - 可能是扫描版/图片型 PDF]")
            
        # 尝试获取页面信息
        print(f"\n[页面尺寸：{page.mediabox.width} x {page.mediabox.height}]")
        
except Exception as e:
    print(f"错误：{e}")
    import traceback
    traceback.print_exc()
