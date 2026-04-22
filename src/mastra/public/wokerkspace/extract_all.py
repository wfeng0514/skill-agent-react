#!/usr/bin/env python3
"""使用多种方法提取 PDF 内容"""

import subprocess
import sys

pdf_path = "./skills/上海象鲜网络科技有限公司_发票金额 2601.65 元.pdf"
output_txt = "./pdf_content.txt"

print("=" * 60)
print("尝试多种方法提取 PDF 内容")
print("=" * 60)

# 方法 1: 尝试 pdftotext 命令行工具
print("\n[方法 1] 尝试 pdftotext...")
try:
    result = subprocess.run(
        ["pdftotext", "-layout", pdf_path, output_txt],
        capture_output=True,
        text=True,
        timeout=30
    )
    if result.returncode == 0:
        print("✓ pdftotext 成功")
        with open(output_txt, 'r', encoding='utf-8') as f:
            content = f.read()
            print("\n" + "=" * 60)
            print("PDF 内容:")
            print("=" * 60)
            print(content)
        sys.exit(0)
    else:
        print(f"✗ pdftotext 失败：{result.stderr}")
except FileNotFoundError:
    print("✗ pdftotext 未安装")
except Exception as e:
    print(f"✗ 错误：{e}")

# 方法 2: 尝试 pypdf
print("\n[方法 2] 尝试 pypdf...")
try:
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    print(f"✓ PDF 页数：{len(reader.pages)}")
    
    full_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            full_text.append(f"--- 第 {i+1} 页 ---\n{text}")
        else:
            full_text.append(f"--- 第 {i+1} 页 ---\n[无法提取文本]")
    
    content = "\n\n".join(full_text)
    print("\n" + "=" * 60)
    print("PDF 内容:")
    print("=" * 60)
    print(content)
    
    with open(output_txt, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n✓ 内容已保存到 {output_txt}")
    
except Exception as e:
    print(f"✗ pypdf 失败：{e}")

# 方法 3: 尝试 pdfplumber
print("\n[方法 3] 尝试 pdfplumber...")
try:
    import pdfplumber
    with pdfplumber.open(pdf_path) as pdf:
        print(f"✓ PDF 页数：{len(pdf.pages)}")
        full_text = []
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                full_text.append(f"--- 第 {i+1} 页 ---\n{text}")
            
            # 提取表格
            tables = page.extract_tables()
            if tables:
                full_text.append(f"\n[表格 - 共{len(tables)}个]")
                for j, table in enumerate(tables):
                    full_text.append(f"\n表格 {j+1}:")
                    for row in table:
                        full_text.append(str(row))
        
        content = "\n\n".join(full_text)
        print("\n" + "=" * 60)
        print("PDF 内容:")
        print("=" * 60)
        print(content)
        
except Exception as e:
    print(f"✗ pdfplumber 失败：{e}")

print("\n" + "=" * 60)
print("提取完成")
print("=" * 60)
